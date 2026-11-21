import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Client } from "@/models/Client";
import { Proposal } from "@/models/Proposal";

const approveSchema = z.object({
  signerName: z.string().trim().min(3, "Informe o nome completo").max(120),
  signerDocument: z.string().trim().min(11, "Informe o CPF ou CNPJ").max(25),
  signatureImage: z
    .string()
    .max(350_000, "Imagem da assinatura muito grande")
    .refine(
      (v) => /^data:image\/png;base64,/.test(v),
      "Assinatura inválida"
    ),
  email: z.string().trim().max(160).optional().default(""),
});

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "IP verificado";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Proposta inválida" }, { status: 400 });
  }

  const parsed = approveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados de assinatura inválidos" },
      { status: 400 }
    );
  }

  const { signerName, signerDocument, signatureImage, email } = parsed.data;
  const signerIp = getClientIp(req);

  await connectDB();
  const proposal = await Proposal.findById(id);
  if (!proposal || !proposal.content) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  const now = new Date();
  proposal.status = "approved";
  proposal.crmStage = "won";
  proposal.temperature = "hot";
  proposal.approvedAt = now;
  proposal.approvedByName = signerName;
  if (email) proposal.approvedByEmail = email;

  proposal.signerName = signerName;
  proposal.signerDocument = signerDocument;
  proposal.signatureImage = signatureImage;
  proposal.signedAt = now;
  proposal.signerIp = signerIp;

  await proposal.save();

  await Promise.all([
    proposal.clientId
      ? Client.updateOne({ _id: proposal.clientId }, { $set: { temperature: "hot" } })
      : Promise.resolve(),
    Activity.create({
      user: proposal.user,
      ...(proposal.clientId ? { client: proposal.clientId } : {}),
      proposal: proposal._id,
      type: "proposal_approved",
      title: "Proposta aprovada e assinada digitalmente!",
      description: `Assinada por ${signerName} (Doc: ${signerDocument}) · IP: ${signerIp}`,
    }),
  ]).catch(() => {});

  return NextResponse.json({
    ok: true,
    status: "approved",
    signerName,
    signerDocument,
    signatureImage,
    signedAt: now.toISOString(),
    signerIp,
  });
}
