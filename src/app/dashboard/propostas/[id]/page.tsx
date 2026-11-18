import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { ProposalEditor } from "@/components/proposal/proposal-editor";
import type { ProposalStatus } from "@/components/dashboard/status-badge";
import { getCurrentUser } from "@/lib/current-user";
import { getPlan } from "@/lib/usage";
import { Proposal } from "@/models/Proposal";

export const metadata: Metadata = { title: "Proposta" };

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const user = await getCurrentUser();
  const proposal = await Proposal.findOne({ _id: id, user: user._id }).lean();
  if (!proposal) notFound();

  const plan = getPlan(user);

  return (
    <ProposalEditor
      initial={{
        id: proposal._id.toString(),
        title: proposal.title,
        clientName: proposal.clientName ?? "",
        brief: proposal.brief ?? "",
        content: proposal.content ?? "",
        riskRadar: (proposal.riskRadar ?? []).map((r) => ({
          type: r.type === "opportunity" ? ("opportunity" as const) : ("warning" as const),
          title: r.title ?? "",
          description: r.description ?? "",
          clause: r.clause ?? "",
        })),
        status: (proposal.status as ProposalStatus) ?? "draft",
        tone: proposal.tone ?? "consultivo",
        aiModel: proposal.aiModel ?? "",
        error: proposal.error ?? "",
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
        viewCount: proposal.viewCount ?? 0,
        lastViewedAt: proposal.lastViewedAt ? proposal.lastViewedAt.toISOString() : null,
        approvedAt: proposal.approvedAt ? proposal.approvedAt.toISOString() : null,
        approvedByName: proposal.approvedByName ?? "",
        company: {
          name: proposal.company?.name || user.company?.name || "",
          cnpj: proposal.company?.cnpj || user.company?.cnpj || "",
          email: proposal.company?.email || user.company?.email || "",
          phone: proposal.company?.phone || user.company?.phone || "",
          website: proposal.company?.website || user.company?.website || "",
          address: proposal.company?.address || user.company?.address || "",
          logo: user.company?.logo || proposal.company?.logo || "",
          brandColor: user.company?.brandColor || proposal.company?.brandColor || "#4f46e5",
        },
        watermark: plan.watermark,
      }}
    />
  );
}
