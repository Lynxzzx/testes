import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Client } from "@/models/Client";

const updateClientSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  company: z.string().trim().max(160).optional(),
  email: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  role: z.string().trim().max(120).optional(),
  source: z
    .enum(["instagram", "indicacao", "whatsapp", "google", "prospeccao", "outro"])
    .optional(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
  notes: z.string().trim().max(5000).optional(),
  temperature: z.enum(["cold", "warm", "hot"]).optional(),
  nextFollowUpAt: z.string().nullable().optional(),
  nextFollowUpTask: z.string().trim().max(240).optional(),
});

export async function PATCH(
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

  const parsed = updateClientSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  await connectDB();
  const client = await Client.findOne({ _id: id, user: session.user.id });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const data = parsed.data;
  if (data.name !== undefined) client.name = data.name;
  if (data.company !== undefined) client.company = data.company;
  if (data.email !== undefined) client.email = data.email;
  if (data.phone !== undefined) client.phone = data.phone;
  if (data.role !== undefined) client.role = data.role;
  if (data.source !== undefined) client.source = data.source;
  if (data.tags !== undefined) client.tags = data.tags;
  if (data.notes !== undefined) client.notes = data.notes;
  if (data.temperature !== undefined) client.temperature = data.temperature;
  if (data.nextFollowUpAt !== undefined) {
    client.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined;
  }
  if (data.nextFollowUpTask !== undefined) client.nextFollowUpTask = data.nextFollowUpTask;

  await client.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
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
  await Client.deleteOne({ _id: id, user: session.user.id });
  return NextResponse.json({ ok: true });
}
