/**
 * Cliente OpenRouter com streaming e fallback automático entre modelos.
 *
 * Estratégia:
 *  1. Tenta cada modelo na ordem de prioridade.
 *  2. Em erros "recuperáveis" (429, 5xx, modelo indisponível, timeout, erro
 *     antes do primeiro token) faz retry com backoff e/ou passa ao próximo.
 *  3. Só "compromete" um modelo após receber o primeiro token de conteúdo —
 *     assim conseguimos trocar de modelo de forma transparente.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const DEFAULT_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
];

export function getModels(): string[] {
  const fromEnv = process.env.OPENROUTER_MODELS?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_MODELS;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public retriable = false,
    public code: "rate_limit" | "unavailable" | "auth" | "bad_request" | "timeout" | "unknown" = "unknown"
  ) {
    super(message);
    this.name = "AIError";
  }
}

const FIRST_TOKEN_TIMEOUT_MS = 90_000; // modelos de raciocínio podem demorar a começar
const MAX_ATTEMPTS_PER_MODEL = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classifyHttpError(status: number, body: string, model: string): AIError {
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message ?? body;
  } catch {
    /* corpo não-JSON */
  }
  if (status === 401 || status === 403)
    return new AIError(`Falha de autenticação no OpenRouter: ${detail}`, 502, false, "auth");
  if (status === 402)
    return new AIError(`Créditos insuficientes no OpenRouter (${model}).`, 502, true, "unavailable");
  if (status === 429)
    return new AIError(`Limite de requisições atingido em ${model}.`, 429, true, "rate_limit");
  if (status === 404 || status === 400)
    // 404: modelo inexistente/indisponível; 400 pode ser parâmetro não suportado pelo provedor
    return new AIError(`Modelo ${model} indisponível: ${detail}`, 503, true, "unavailable");
  if (status >= 500)
    return new AIError(`Provedor instável em ${model} (${status}).`, 503, true, "unavailable");
  return new AIError(`Erro ${status} em ${model}: ${detail}`, 500, true, "unknown");
}

/** Lê um corpo SSE do OpenRouter e emite apenas os deltas de conteúdo. */
async function* parseSSE(body: ReadableStream<Uint8Array>, model: string): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || line.startsWith(":")) continue; // comentários de keep-alive
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;

        let json: {
          error?: { message?: string; code?: number };
          choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
        };
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        if (json.error) {
          const code = Number(json.error.code) || 500;
          throw classifyHttpError(code, JSON.stringify(json), model);
        }
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function openModelStream(
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<AsyncGenerator<string>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AIError("OPENROUTER_API_KEY não configurada.", 500, false, "auth");

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => controller.abort(), FIRST_TOKEN_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://usepropoz.com.br",
        "X-Title": "Propoz",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.6,
        max_tokens: 6000,
        reasoning: { exclude: true },
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw classifyHttpError(res.status, text, model);
    }

    const iterator = parseSSE(res.body, model);
    // Aguarda o primeiro token para confirmar que o modelo está respondendo
    const first = await iterator.next();
    clearTimeout(timer);
    if (first.done) throw new AIError(`Resposta vazia de ${model}.`, 503, true, "unavailable");

    return (async function* () {
      try {
        yield first.value;
        yield* iterator;
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }
    })();
  } catch (err) {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    if (err instanceof AIError) throw err;
    if ((err as Error)?.name === "AbortError") {
      if (signal?.aborted) throw new AIError("Requisição cancelada.", 499, false, "unknown");
      throw new AIError(`Tempo esgotado aguardando ${model}.`, 504, true, "timeout");
    }
    throw new AIError(`Falha de rede com ${model}: ${(err as Error)?.message}`, 503, true, "unavailable");
  }
}

/**
 * Abre um stream de chat com fallback automático.
 * Retorna o modelo efetivamente usado e um iterador assíncrono de texto.
 */
export async function streamChatWithFallback(
  messages: ChatMessage[],
  opts: { signal?: AbortSignal; models?: string[] } = {}
): Promise<{ model: string; stream: AsyncGenerator<string> }> {
  const models = opts.models ?? getModels();
  let lastError: AIError | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const stream = await openModelStream(model, messages, opts.signal);
        return { model, stream };
      } catch (err) {
        const e = err instanceof AIError ? err : new AIError(String(err));
        lastError = e;
        console.warn(`[openrouter] ${model} tentativa ${attempt} falhou: ${e.message}`);
        if (!e.retriable) throw e;
        // Retry apenas para rate-limit/instabilidade momentânea; caso contrário, próximo modelo
        if (e.code === "rate_limit" || e.code === "unavailable") {
          if (attempt < MAX_ATTEMPTS_PER_MODEL && e.code === "rate_limit") {
            await sleep(1500 * attempt);
            continue;
          }
        }
        break;
      }
    }
  }

  if (lastError?.code === "rate_limit") {
    throw new AIError(
      "Os modelos de IA estão com alta demanda no momento. Tente novamente em alguns instantes.",
      429,
      false,
      "rate_limit"
    );
  }
  throw new AIError(
    "Não foi possível gerar a proposta agora: todos os modelos de IA estão indisponíveis. Tente novamente em instantes.",
    503,
    false,
    "unavailable"
  );
}
