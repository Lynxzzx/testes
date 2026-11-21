import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PublicProposalView } from "@/components/proposal/public-proposal-view";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getPlan } from "@/lib/usage";
import { Activity } from "@/models/Activity";
import { Client } from "@/models/Client";
import { Proposal } from "@/models/Proposal";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isValidObjectId(id)) return { title: "Proposta Comercial" };

  await connectDB();
  const proposal = await Proposal.findById(id).select("title company").lean();
  if (!proposal) return { title: "Proposta Comercial" };

  return {
    title: `${proposal.title}${proposal.company?.name ? ` · ${proposal.company.name}` : ""}`,
    description: "Visualize a proposta comercial completa e aprove online.",
  };
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  const [proposal, session] = await Promise.all([
    Proposal.findById(id).lean(),
    auth(),
  ]);

  if (!proposal || !proposal.content) notFound();

  const isOwner = session?.user?.id === proposal.user.toString();

  // Registra visualização quando aberta pelo cliente (não pelo próprio autor logado)
  if (!isOwner) {
    const now = new Date();
    const shouldPromoteToSent =
      !proposal.crmStage || proposal.crmStage === "lead" || proposal.crmStage === "created";

    await Promise.all([
      Proposal.updateOne(
        { _id: proposal._id },
        {
          $inc: { viewCount: 1 },
          $set: {
            lastViewedAt: now,
            temperature: "hot",
            ...(shouldPromoteToSent ? { crmStage: "sent" } : {}),
            ...(proposal.status === "draft" ? { status: "sent", sentAt: proposal.sentAt || now } : {}),
          },
        }
      ),
      proposal.clientId
        ? Client.updateOne({ _id: proposal.clientId }, { $set: { temperature: "hot" } })
        : Promise.resolve(),
      Activity.create({
        user: proposal.user,
        ...(proposal.clientId ? { client: proposal.clientId } : {}),
        proposal: proposal._id,
        type: "proposal_viewed",
        title: "Cliente visualizou a proposta no link interativo",
        description: `${proposal.title}${proposal.clientName ? ` (${proposal.clientName})` : ""}`,
      }),
    ]).catch(() => {});
  }

  const owner = await User.findById(proposal.user).lean();
  const plan = owner ? getPlan(owner) : { watermark: true };

  return (
    <PublicProposalView
      proposal={{
        id: proposal._id.toString(),
        title: proposal.title,
        clientName: proposal.clientName ?? "",
        content: proposal.content,
        status: proposal.status ?? "draft",
        createdAt: proposal.createdAt.toISOString(),
        approvedAt: proposal.approvedAt ? proposal.approvedAt.toISOString() : null,
        approvedByName: proposal.approvedByName ?? "",
        signerName: proposal.signerName ?? "",
        signerDocument: proposal.signerDocument ?? "",
        signatureImage: proposal.signatureImage ?? "",
        signedAt: proposal.signedAt ? proposal.signedAt.toISOString() : null,
        signerIp: proposal.signerIp ?? "",
        watermark: plan.watermark,
        company: {
          name: proposal.company?.name || owner?.company?.name || "",
          cnpj: proposal.company?.cnpj || owner?.company?.cnpj || "",
          email: proposal.company?.email || owner?.company?.email || "",
          phone: proposal.company?.phone || owner?.company?.phone || "",
          website: proposal.company?.website || owner?.company?.website || "",
          address: proposal.company?.address || owner?.company?.address || "",
          responsible: proposal.company?.responsible || owner?.company?.responsible || "",
          logo: owner?.company?.logo || proposal.company?.logo || "",
          brandColor: owner?.company?.brandColor || proposal.company?.brandColor || "#4f46e5",
        },
      }}
    />
  );
}
