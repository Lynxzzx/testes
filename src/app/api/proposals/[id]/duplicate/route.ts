import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Proposal } from "@/models/Proposal";

export async function POST(
  _req: Request,
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

  await connectDB();
  const original = await Proposal.findOne({ _id: id, user: session.user.id }).lean();
  if (!original) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  const baseTitle = original.title.replace(/\s*\(Cópia(?:\s+\d+)?\)$/i, "").trim();
  const copy = await Proposal.create({
    user: session.user.id,
    title: `${baseTitle} (Cópia)`.slice(0, 160),
    clientName: original.clientName ?? "",
    brief: original.brief,
    tone: original.tone ?? "consultivo",
    sections: original.sections ?? [],
    company: original.company ?? {},
    content: original.content ?? "",
    status: "draft",
    aiModel: original.aiModel ?? "",
  });

  return NextResponse.json({ ok: true, id: copy._id.toString() }, { status: 201 });
}
