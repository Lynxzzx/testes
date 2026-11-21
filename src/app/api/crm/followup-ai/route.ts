import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/lib/auth";
import { streamChatWithFallback } from "@/lib/ai/openrouter";
import { resolveCrmStage } from "@/lib/crm";
import { connectDB } from "@/lib/db";
import { extractProposalTotalBrl, formatBrl } from "@/lib/proposal-charts";
import { Proposal } from "@/models/Proposal";

export const runtime = "nodejs";
export const maxDuration = 45;

function buildFallbackFollowUp(opts: {
  clientName: string;
  title: string;
  valueFormatted: string;
  viewCount: number;
  daysSince: number;
  publicUrl: string;
}): string {
  const greeting = opts.clientName ? `Olá, *${opts.clientName}*! Tudo bem?` : "Olá! Tudo bem?";

  if (opts.viewCount > 0) {
    return `${greeting}

Vi que você conseguiu abrir a proposta comercial do projeto *${opts.title}*${opts.valueFormatted ? ` (${opts.valueFormatted})` : ""}!

Ficou alguma dúvida sobre o escopo, o cronograma ou as condições de pagamento? Se fizer sentido para você, podemos fazer um alinhamento rápido de 10 minutos ou você pode aprovar direto pelo link interativo:
🔗 ${opts.publicUrl}

Me avise como fica melhor para avançarmos!`;
  }

  return `${greeting}

Passando para confirmar se você conseguiu receber e dar uma olhada na proposta comercial do projeto *${opts.title}*${opts.valueFormatted ? ` (${opts.valueFormatted})` : ""}${opts.daysSince > 1 ? ` que enviei há ${opts.daysSince} dias` : ""}.

Deixei tudo organizado no link interativo abaixo (você consegue visualizar no celular e aprovar em 1 clique):
🔗 ${opts.publicUrl}

Quando puder dar uma olhada, me diga o que achou para reservarmos sua janela no nosso cronograma!`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const proposalId = String(body?.proposalId ?? "");
  const origin = String(body?.origin ?? "https://usepropoz.com.br").replace(/\/$/, "");

  if (!isValidObjectId(proposalId)) {
    return NextResponse.json({ error: "Proposta inválida" }, { status: 400 });
  }

  await connectDB();
  const proposal = await Proposal.findOne({
    _id: proposalId,
    user: session.user.id,
  }).lean();

  if (!proposal) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  const totalBrl =
    proposal.dealValue && proposal.dealValue > 0
      ? proposal.dealValue
      : extractProposalTotalBrl(proposal.content || "");
  const valueFormatted = totalBrl > 0 ? formatBrl(totalBrl) : "";
  const viewCount = proposal.viewCount ?? 0;
  const refDate = proposal.sentAt || proposal.createdAt;
  const daysSince = Math.max(
    0,
    Math.round((Date.now() - new Date(refDate).getTime()) / 86_400_000)
  );
  const stage = resolveCrmStage(proposal);
  const publicUrl = `${origin}/p/${proposal._id.toString()}`;

  const fallbackMessage = buildFallbackFollowUp({
    clientName: proposal.clientName || "",
    title: proposal.title,
    valueFormatted,
    viewCount,
    daysSince,
    publicUrl,
  });

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ message: fallbackMessage });
  }

  const systemPrompt = `Você é um especialista brasileiro em vendas consultivas B2B via WhatsApp.
Sua tarefa é escrever UMA MENSAGEM CURTA, natural, humana e altamente persuasiva de follow-up comercial para WhatsApp.
REGRAS:
1. Escreva apenas a mensagem pronta para copiar e colar no WhatsApp (sem aspas em volta e sem explicações).
2. Use formatação leve de WhatsApp (*negrito* apenas no nome do projeto ou valor).
3. Não seja robótico nem agressivo — demonstre interesse genuíno em ajudar o cliente a destravar o projeto e inclua o link interativo da proposta.`;

  const userPrompt = `Dados do negócio:
- Cliente: ${proposal.clientName || "Cliente"}
- Projeto: ${proposal.title}
- Empresa que enviou: ${proposal.company?.name || "Nossa equipe"}
- Valor da proposta: ${valueFormatted || "Conforme proposta"}
- Etapa atual no funil: ${stage}
- Tempo desde o envio: ${daysSince === 0 ? "enviada hoje" : `${daysSince} dia(s)`}
- Rastreamento de leitura: ${
    viewCount > 0
      ? `O cliente JÁ ABRIU a proposta ${viewCount} vez(es) pelo link interativo!`
      : "O cliente AINDA NÃO ABRIU o link da proposta."
  }
- Link interativo para visualização e aceite: ${publicUrl}

Escreva agora a mensagem ideal de follow-up para o WhatsApp:`;

  try {
    const { stream } = await streamChatWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);
    let out = "";
    for await (const chunk of stream) {
      out += chunk;
    }
    const clean = out.trim().replace(/^["']|["']$/g, "");
    return NextResponse.json({ message: clean.length > 40 ? clean : fallbackMessage });
  } catch {
    return NextResponse.json({ message: fallbackMessage });
  }
}
