import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { streamChatWithFallback } from "@/lib/ai/openrouter";
import { sanitizeProposalMarkdown } from "@/lib/ai/prompts";
import { Proposal } from "@/models/Proposal";

export const runtime = "nodejs";
export const maxDuration = 60;

const refineSchema = z.object({
  heading: z.string().trim().max(200).default(""),
  body: z.string().trim().min(5, "A seção está vazia").max(20000),
  action: z.enum(["persuasive", "shorten", "technical"]),
});

const ACTION_INSTRUCTIONS: Record<"persuasive" | "shorten" | "technical", string> = {
  persuasive:
    "Reescreva o texto tornando-o MAIS PERSUASIVO e orientado a valor e retorno sobre o investimento (ROI) para o cliente, destacando benefícios claros e segurança na entrega. Mantenha todos os valores em R$, prazos e tabelas existentes.",
  shorten:
    "ENCURTE e torne o texto mais direto, conciso e escaneável (reduza em cerca de 35% a 45% as palavras desnecessárias), preservando todos os fatos, prazos, valores em R$ e estrutura de tabelas/listas.",
  technical:
    "Reescreva o texto tornando-o MAIS TÉCNICO, detalhado e executivo, evidenciando rigor metodológico, arquitetura, boas práticas, governança e entregáveis concretos. Mantenha todos os valores em R$, prazos e tabelas existentes.",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const parsed = refineSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { heading, body, action } = parsed.data;

  await connectDB();
  const proposal = await Proposal.findOne({ _id: id, user: session.user.id })
    .select("title clientName company")
    .lean();

  if (!proposal) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  const systemPrompt = `Você é um consultor comercial sênior brasileiro revisando UMA ÚNICA SEÇÃO de uma proposta comercial em português do Brasil.
REGRAS OBRIGATÓRIAS:
1. Retorne SOMENTE o conteúdo reescrito do corpo da seção em Markdown puro — SEM incluir o título "## ${heading}" no início, sem comentários e sem cercas de código (\`\`\`).
2. É ESTRITAMENTE PROIBIDO usar sintaxe LaTeX ($...$, \\$, \\hat{}, etc.). Valores monetários devem ser escritos como R$ 10.000,00.
3. Preserve tabelas Markdown caso existam na seção.`;

  const userPrompt = `Contexto do projeto:
- Proposta: ${proposal.title}
- Cliente: ${proposal.clientName || "Cliente"}
- Empresa prestadora: ${proposal.company?.name || "Nossa empresa"}
- Seção sendo refinada: ${heading || "Introdução"}

Instrução de refinamento:
${ACTION_INSTRUCTIONS[action]}

Texto atual da seção:
"""
${body}
"""

Responda apenas com o novo corpo da seção em Markdown:`;

  try {
    const { stream } = await streamChatWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }

    let cleaned = sanitizeProposalMarkdown(result);
    // Remove eventual título ## repetido pelo modelo no topo do bloco
    if (heading) {
      const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(`^##+\\s*${escapedHeading}\\s*\\n+`, "i"), "").trim();
    }

    if (!cleaned) {
      return NextResponse.json(
        { error: "A IA retornou uma resposta vazia. Tente novamente." },
        { status: 502 }
      );
    }

    return NextResponse.json({ content: cleaned });
  } catch (err) {
    console.error("[refine-section]", err);
    return NextResponse.json(
      { error: (err as Error)?.message ?? "Não foi possível refinar a seção agora." },
      { status: 502 }
    );
  }
}
