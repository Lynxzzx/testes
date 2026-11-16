import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { updateProposalSchema } from "@/lib/validations";
import { Proposal } from "@/models/Proposal";

type Ctx = { params: Promise<{ id: string }> };

async function getOwned(id: string, userId: string) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  return Proposal.findOne({ _id: id, user: userId });
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const proposal = await getOwned(id, session.user.id);
  if (!proposal) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: proposal._id.toString(),
    title: proposal.title,
    status: proposal.status,
    content: proposal.content,
    error: proposal.error,
    updatedAt: proposal.updatedAt,
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;

  const parsed = updateProposalSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const proposal = await getOwned(id, session.user.id);
  if (!proposal) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  if (proposal.status === "generating") {
    return NextResponse.json({ error: "A proposta ainda está sendo gerada." }, { status: 409 });
  }

  Object.assign(proposal, parsed.data);
  await proposal.save();
  return NextResponse.json({ ok: true, updatedAt: proposal.updatedAt });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  await connectDB();
  const res = await Proposal.deleteOne({ _id: id, user: session.user.id });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
