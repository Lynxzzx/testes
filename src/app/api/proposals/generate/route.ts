import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AIError, streamChatWithFallback } from "@/lib/ai/openrouter";
import {
  buildProposalMessages,
  cleanModelOutput,
  computeFastCloseDeadline,
} from "@/lib/ai/prompts";
import { consumeCredit, refundCredit } from "@/lib/usage";
import { generateSchema } from "@/lib/validations";
import { Proposal } from "@/models/Proposal";
import { User } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = generateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const input = parsed.data;

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // 1) Consome crédito (atômico) antes de chamar a IA
  const ok = await consumeCredit(userId);
  if (!ok) {
    return NextResponse.json(
      {
        error: "Você atingiu o limite de 3 propostas do plano Free este mês. Faça upgrade para o Pro e gere propostas ilimitadas.",
        code: "limit_reached",
      },
      { status: 402 }
    );
  }

  if (input.saveAsDefault) {
    const set: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.company)) set[`company.${k}`] = v;
    await User.updateOne({ _id: userId }, { $set: set });
  }

  const proposal = await Proposal.create({
    user: userId,
    title: input.title,
    clientName: input.clientName,
    brief: input.brief,
    tone: input.tone,
    sections: input.sections,
    suggestMarketPricing: input.suggestMarketPricing ?? false,
    fastCloseEnabled: input.fastCloseEnabled ?? false,
    fastCloseWindow: input.fastCloseEnabled ? input.fastCloseWindow : "",
    fastCloseDeadline: input.fastCloseEnabled
      ? computeFastCloseDeadline(input.fastCloseWindow)
      : undefined,
    fastCloseBonus: input.fastCloseEnabled ? input.fastCloseBonus : "",
    company: {
      ...input.company,
      logo: user.company?.logo ?? "",
      brandColor: user.company?.brandColor || "#4f46e5",
    },
    status: "generating",
  });

  // 2) Abre o stream com fallback. Erros aqui ainda podem virar resposta JSON.
  let model: string;
  let stream: AsyncGenerator<string>;
  try {
    const messages = buildProposalMessages(input);
    // Não repassamos req.signal: se o usuário sair da página, a geração continua e é salva.
    ({ model, stream } = await streamChatWithFallback(messages));
  } catch (err) {
    await refundCredit(userId);
    const e = err instanceof AIError ? err : new AIError("Erro inesperado na geração.");
    await Proposal.updateOne({ _id: proposal._id }, { status: "error", error: e.message });
    return NextResponse.json(
      { error: e.message, code: e.code, proposalId: proposal._id.toString() },
      { status: e.status === 499 ? 400 : e.status }
    );
  }

  // 3) Faz streaming para o cliente e persiste o resultado ao final
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let content = "";
      let clientOpen = true;
      let lastSave = Date.now();
      try {
        for await (const chunk of stream) {
          content += chunk;
          if (clientOpen) {
            try {
              controller.enqueue(encoder.encode(chunk));
            } catch {
              clientOpen = false; // cliente desconectou — seguimos gerando e salvando
            }
          }
          // Salvamento parcial periódico (resiliência caso a função seja interrompida)
          if (Date.now() - lastSave > 5000) {
            lastSave = Date.now();
            Proposal.updateOne({ _id: proposal._id }, { content }).catch(() => {});
          }
        }
        const finalContent = cleanModelOutput(content);
        if (finalContent.length < 100) throw new AIError("A IA retornou uma resposta muito curta.");
        await Proposal.updateOne(
          { _id: proposal._id },
          { content: finalContent, status: "draft", aiModel: model, error: "" }
        );
      } catch (err) {
        console.error("[generate] erro durante o stream", err);
        const message = err instanceof Error ? err.message : "Falha durante a geração";
        if (content.length > 300) {
          // Conteúdo parcial aproveitável: mantém como rascunho para edição
          await Proposal.updateOne(
            { _id: proposal._id },
            { content: cleanModelOutput(content), status: "draft", aiModel: model, error: message }
          );
        } else {
          await refundCredit(userId);
          await Proposal.updateOne({ _id: proposal._id }, { status: "error", error: message });
        }
        if (clientOpen) {
          try {
            controller.enqueue(encoder.encode(`\n\n[[ERRO]] ${message}`));
          } catch {}
        }
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Proposal-Id": proposal._id.toString(),
      "X-AI-Model": model,
    },
  });
}
