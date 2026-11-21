import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Client } from "@/models/Client";
import { Proposal } from "@/models/Proposal";

const createClientSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente").max(160),
  company: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  role: z.string().trim().max(120).optional().default(""),
  source: z
    .enum(["instagram", "indicacao", "whatsapp", "google", "prospeccao", "outro"])
    .optional()
    .default("whatsapp"),
  tags: z.array(z.string().trim().max(40)).max(12).optional().default([]),
  notes: z.string().trim().max(5000).optional().default(""),
  temperature: z.enum(["cold", "warm", "hot"]).optional().default("warm"),
  // Opcionalmente já cria um negócio na coluna "Novo Lead / Briefing"
  createLeadDeal: z.boolean().optional().default(false),
  dealTitle: z.string().trim().max(160).optional().default(""),
  dealValue: z.number().min(0).max(100_000_000).optional().default(0),
  dealBrief: z.string().trim().max(5000).optional().default(""),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = createClientSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  await connectDB();

  const client = await Client.create({
    user: session.user.id,
    name: data.name,
    company: data.company || data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    source: data.source,
    tags: data.tags,
    notes: data.notes,
    temperature: data.temperature,
  });

  let createdDealId: string | null = null;
  if (data.createLeadDeal) {
    const title = data.dealTitle || `Oportunidade — ${data.company || data.name}`;
    const deal = await Proposal.create({
      user: session.user.id,
      clientId: client._id,
      title,
      clientName: data.company || data.name,
      brief:
        data.dealBrief ||
        `Lead cadastrado no CRM para ${data.company || data.name}.${data.notes ? ` Notas: ${data.notes}` : ""}`,
      status: "draft",
      crmStage: "lead",
      dealValue: data.dealValue || 0,
      temperature: data.temperature,
      content: `# ${title}\n*Lead em fase de briefing · ${data.company || data.name}*\n\n## Resumo do Lead\n${
        data.dealBrief || data.notes || "Briefing inicial em levantamento com o cliente."
      }`,
    });
    createdDealId = deal._id.toString();
  }

  Activity.create({
    user: session.user.id,
    client: client._id,
    ...(createdDealId ? { proposal: createdDealId } : {}),
    type: "client_created",
    title: data.createLeadDeal
      ? `Novo lead e oportunidade criados: ${data.company || data.name}`
      : `Cliente cadastrado: ${data.company || data.name}`,
    description: data.dealTitle || data.email || data.phone || "",
  }).catch(() => {});

  return NextResponse.json(
    {
      ok: true,
      client: {
        id: client._id.toString(),
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        role: client.role,
        source: client.source,
        tags: client.tags,
        notes: client.notes,
        temperature: client.temperature,
      },
      dealId: createdDealId,
    },
    { status: 201 }
  );
}
