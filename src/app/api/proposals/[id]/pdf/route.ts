import path from "node:path";
import React from "react";
import { isValidObjectId } from "mongoose";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProposalDocument } from "@/lib/pdf/ProposalDocument";
import { getPlan } from "@/lib/usage";
import { slugify } from "@/lib/utils";
import { Proposal } from "@/models/Proposal";
import { User } from "@/models/User";

// Referência explícita para o rastreador de arquivos serverless (@vercel/nft)
const _PDFKIT_FONTS_DIR = path.join(process.cwd(), "node_modules/pdfkit/js/standard-fonts");
const _PDFKIT_DATA_DIR = path.join(process.cwd(), "node_modules/pdfkit/js/data");
void _PDFKIT_FONTS_DIR;
void _PDFKIT_DATA_DIR;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ error: "ID inválido" }, { status: 400 });

  await connectDB();
  const [proposal, user] = await Promise.all([
    Proposal.findOne({ _id: id, user: session.user.id }).lean(),
    User.findById(session.user.id).lean(),
  ]);
  if (!proposal || !user) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });
  if (!proposal.content?.trim()) {
    return Response.json({ error: "A proposta ainda não tem conteúdo." }, { status: 409 });
  }

  const plan = getPlan(user);
  // Logo e cor da marca atuais do usuário têm prioridade (permite personalizar após gerar)
  const company = {
    ...(proposal.company ?? {}),
    logo: user.company?.logo || proposal.company?.logo || "",
    brandColor: user.company?.brandColor || proposal.company?.brandColor || "#4f46e5",
  };

  try {
    const element = React.createElement(ProposalDocument, {
      title: proposal.title,
      content: proposal.content,
      company,
      watermark: plan.watermark,
      signature:
        proposal.status === "approved" || proposal.status === "final" || proposal.signerName
          ? {
              signerName: proposal.signerName || proposal.approvedByName || "",
              signerDocument: proposal.signerDocument || "",
              signatureImage: proposal.signatureImage || "",
              signedAt: proposal.signedAt || proposal.approvedAt || null,
              signerIp: proposal.signerIp || "",
            }
          : null,
    }) as unknown as React.ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(element);
    const filename = `${slugify(proposal.title) || "proposta"}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[pdf]", err);
    return Response.json({ error: "Falha ao gerar o PDF." }, { status: 500 });
  }
}
