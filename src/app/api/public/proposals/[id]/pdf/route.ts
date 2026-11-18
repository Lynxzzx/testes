import path from "node:path";
import React from "react";
import { isValidObjectId } from "mongoose";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { connectDB } from "@/lib/db";
import { ProposalDocument } from "@/lib/pdf/ProposalDocument";
import { getPlan } from "@/lib/usage";
import { slugify } from "@/lib/utils";
import { Proposal } from "@/models/Proposal";
import { User } from "@/models/User";

const _PDFKIT_FONTS_DIR = path.join(process.cwd(), "node_modules/pdfkit/js/standard-fonts");
const _PDFKIT_DATA_DIR = path.join(process.cwd(), "node_modules/pdfkit/js/data");
void _PDFKIT_FONTS_DIR;
void _PDFKIT_DATA_DIR;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();
  const proposal = await Proposal.findById(id).lean();
  if (!proposal || !proposal.content?.trim()) {
    return Response.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  const owner = await User.findById(proposal.user).lean();
  const plan = owner ? getPlan(owner) : { watermark: true };

  const company = {
    ...(proposal.company ?? {}),
    logo: owner?.company?.logo || proposal.company?.logo || "",
    brandColor: owner?.company?.brandColor || proposal.company?.brandColor || "#4f46e5",
  };

  try {
    const element = React.createElement(ProposalDocument, {
      title: proposal.title,
      content: proposal.content,
      company,
      watermark: plan.watermark,
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
    console.error("[public/pdf]", err);
    return Response.json({ error: "Falha ao gerar o PDF." }, { status: 500 });
  }
}
