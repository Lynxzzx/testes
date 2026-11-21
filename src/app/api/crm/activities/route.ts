import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";

const createNoteSchema = z.object({
  proposalId: z.string().optional(),
  clientId: z.string().optional(),
  title: z.string().trim().min(2, "Digite uma anotação").max(240),
  description: z.string().trim().max(2000).optional().default(""),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposalId");
  const clientId = searchParams.get("clientId");

  const filter: Record<string, unknown> = { user: session.user.id };
  const orConditions: Record<string, unknown>[] = [];
  if (proposalId && isValidObjectId(proposalId)) {
    orConditions.push({ proposal: proposalId });
  }
  if (clientId && isValidObjectId(clientId)) {
    orConditions.push({ client: clientId });
  }
  if (orConditions.length === 1) {
    Object.assign(filter, orConditions[0]);
  } else if (orConditions.length > 1) {
    filter.$or = orConditions;
  }

  await connectDB();
  const list = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();

  return NextResponse.json({
    activities: list.map((a) => ({
      id: a._id.toString(),
      type: a.type,
      title: a.title,
      description: a.description ?? "",
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = createNoteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { proposalId, clientId, title, description } = parsed.data;
  await connectDB();

  const activity = await Activity.create({
    user: session.user.id,
    ...(proposalId && isValidObjectId(proposalId) ? { proposal: proposalId } : {}),
    ...(clientId && isValidObjectId(clientId) ? { client: clientId } : {}),
    type: "note",
    title,
    description,
  });

  return NextResponse.json(
    {
      ok: true,
      activity: {
        id: activity._id.toString(),
        type: activity.type,
        title: activity.title,
        description: activity.description ?? "",
        createdAt: activity.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
