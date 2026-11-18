import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Proposal } from "@/models/Proposal";

const approveSchema = z.object({
  name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Proposta inválida" }, { status: 400 });
  }

  const parsed = approveSchema.safeParse(await req.json().catch(() => ({})));
  const name = parsed.success ? parsed.data.name : "";
  const email = parsed.success ? parsed.data.email : "";

  await connectDB();
  const proposal = await Proposal.findById(id);
  if (!proposal || !proposal.content) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  const now = new Date();
  proposal.status = "approved";
  proposal.approvedAt = now;
  if (name) proposal.approvedByName = name;
  if (email) proposal.approvedByEmail = email;
  await proposal.save();

  return NextResponse.json({
    ok: true,
    status: "approved",
    approvedAt: now.toISOString(),
    approvedByName: proposal.approvedByName,
  });
}
