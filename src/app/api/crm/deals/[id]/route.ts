import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CRM_STAGES, stageToProposalStatus, type CrmStage } from "@/lib/crm";
import { connectDB } from "@/lib/db";
import { Activity } from "@/models/Activity";
import { Proposal } from "@/models/Proposal";

const patchDealSchema = z.object({
  crmStage: z.enum(["lead", "created", "sent", "negotiation", "won", "lost"]).optional(),
  temperature: z.enum(["cold", "warm", "hot"]).optional(),
  dealValue: z.number().min(0).max(100_000_000).optional(),
  lostReason: z.string().trim().max(200).optional(),
  lostNotes: z.string().trim().max(1000).optional(),
  nextFollowUpAt: z.string().nullable().optional(),
  nextFollowUpTask: z.string().trim().max(240).optional(),
  clientName: z.string().trim().max(160).optional(),
  clientId: z.string().nullable().optional(),
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

  const parsed = patchDealSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  await connectDB();
  const proposal = await Proposal.findOne({ _id: id, user: session.user.id });
  if (!proposal) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  const data = parsed.data;
  const prevStage = proposal.crmStage;
  const now = new Date();

  if (data.crmStage) {
    proposal.crmStage = data.crmStage;
    proposal.status = stageToProposalStatus(data.crmStage);

    if ((data.crmStage === "sent" || data.crmStage === "negotiation") && !proposal.sentAt) {
      proposal.sentAt = now;
    }
    if (data.crmStage === "won" && !proposal.approvedAt) {
      proposal.approvedAt = now;
    }
  }

  if (data.temperature !== undefined) proposal.temperature = data.temperature;
  if (data.dealValue !== undefined) proposal.dealValue = data.dealValue;
  if (data.lostReason !== undefined) proposal.lostReason = data.lostReason;
  if (data.lostNotes !== undefined) proposal.lostNotes = data.lostNotes;
  if (data.clientName !== undefined) proposal.clientName = data.clientName;
  if (data.clientId !== undefined) {
    proposal.clientId =
      data.clientId && isValidObjectId(data.clientId)
        ? (data.clientId as unknown as typeof proposal.clientId)
        : undefined;
  }

  let followUpChanged = false;
  if (data.nextFollowUpAt !== undefined) {
    proposal.nextFollowUpAt = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined;
    followUpChanged = Boolean(data.nextFollowUpAt);
  }
  if (data.nextFollowUpTask !== undefined) {
    proposal.nextFollowUpTask = data.nextFollowUpTask;
  }

  await proposal.save();

  // Registra na linha do tempo de auditoria comercial
  if (data.crmStage && data.crmStage !== prevStage) {
    const stageInfo = CRM_STAGES.find((s) => s.id === (data.crmStage as CrmStage));
    const stageLabel = stageInfo?.label ?? data.crmStage;
    const isLost = data.crmStage === "lost";
    const isWon = data.crmStage === "won";

    Activity.create({
      user: session.user.id,
      ...(proposal.clientId ? { client: proposal.clientId } : {}),
      proposal: proposal._id,
      type: isLost
        ? "proposal_lost"
        : isWon
          ? "proposal_approved"
          : "stage_changed",
      title: isLost
        ? `Negócio marcado como Perdido${data.lostReason ? ` (${data.lostReason})` : ""}`
        : isWon
          ? "Negócio movido para Fechado (Ganho)!"
          : `Movido no funil para "${stageLabel}"`,
      description: data.lostNotes
        ? `${proposal.title} — ${data.lostNotes}`
        : proposal.title,
    }).catch(() => {});
  } else if (followUpChanged) {
    Activity.create({
      user: session.user.id,
      ...(proposal.clientId ? { client: proposal.clientId } : {}),
      proposal: proposal._id,
      type: "followup_scheduled",
      title: `Follow-up agendado${proposal.nextFollowUpTask ? `: ${proposal.nextFollowUpTask}` : ""}`,
      description: proposal.title,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    crmStage: proposal.crmStage,
    status: proposal.status,
    temperature: proposal.temperature,
    dealValue: proposal.dealValue,
    lostReason: proposal.lostReason,
    nextFollowUpAt: proposal.nextFollowUpAt ?? null,
    nextFollowUpTask: proposal.nextFollowUpTask,
  });
}
