import type { Metadata } from "next";
import { CrmBoard, type CrmClientItem, type CrmDealItem } from "@/components/crm/crm-board";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  resolveCrmStage,
  resolveLeadTemperature,
  type LeadSource,
  type LeadTemperature,
} from "@/lib/crm";
import { getCurrentUser } from "@/lib/current-user";
import { extractProposalTotalBrl } from "@/lib/proposal-charts";
import { getPlan } from "@/lib/usage";
import { Client } from "@/models/Client";
import { Proposal } from "@/models/Proposal";

export const metadata: Metadata = { title: "CRM & Funil de Vendas" };
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await getCurrentUser();
  const plan = getPlan(user);

  const filter: Record<string, unknown> = { user: user._id };
  if (Number.isFinite(plan.historyDays)) {
    filter.createdAt = { $gte: new Date(Date.now() - plan.historyDays * 86_400_000) };
  }

  const [rawProposals, rawClients] = await Promise.all([
    Proposal.find(filter)
      .select(
        "clientId title clientName status crmStage dealValue temperature viewCount lastViewedAt sentAt approvedAt signerName lostReason lostNotes nextFollowUpAt nextFollowUpTask content createdAt updatedAt"
      )
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    Client.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(250)
      .lean(),
  ]);

  const deals: CrmDealItem[] = rawProposals.map((p) => {
    const computedValue =
      p.dealValue && p.dealValue > 0
        ? p.dealValue
        : extractProposalTotalBrl(p.content || "");

    return {
      id: p._id.toString(),
      clientId: p.clientId ? p.clientId.toString() : null,
      title: p.title,
      clientName: p.clientName ?? "",
      crmStage: resolveCrmStage(p),
      status: p.status ?? "draft",
      dealValue: computedValue,
      temperature: resolveLeadTemperature(p),
      viewCount: p.viewCount ?? 0,
      lastViewedAt: p.lastViewedAt ? p.lastViewedAt.toISOString() : null,
      sentAt: p.sentAt ? p.sentAt.toISOString() : null,
      approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
      signerName: p.signerName ?? "",
      lostReason: p.lostReason ?? "",
      lostNotes: p.lostNotes ?? "",
      nextFollowUpAt: p.nextFollowUpAt ? p.nextFollowUpAt.toISOString() : null,
      nextFollowUpTask: p.nextFollowUpTask ?? "",
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  // Se houver clientes nas propostas antigas que ainda não estão na coleção `Client`,
  // expomos também como clientes virtuais para garantir 100% de retrocompatibilidade.
  const clients: CrmClientItem[] = rawClients.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    company: c.company || c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    role: c.role ?? "",
    source: (c.source as LeadSource) ?? "outro",
    tags: c.tags ?? [],
    notes: c.notes ?? "",
    temperature: (c.temperature as LeadTemperature) ?? "warm",
    createdAt: c.createdAt.toISOString(),
  }));

  const existingNames = new Set(
    clients.flatMap((c) => [c.name.toLowerCase(), c.company.toLowerCase()])
  );
  for (const d of deals) {
    const cName = d.clientName.trim();
    if (cName && !existingNames.has(cName.toLowerCase())) {
      existingNames.add(cName.toLowerCase());
      clients.push({
        id: `virtual-${d.id}`,
        name: cName,
        company: cName,
        email: "",
        phone: "",
        role: "",
        source: "outro",
        tags: [],
        notes: "",
        temperature: d.temperature,
        createdAt: d.createdAt,
      });
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="CRM & Funil de Vendas"
        description="Acompanhe seus leads, propostas enviadas, visualizações em tempo real e receita fechada."
      />
      <div className="mt-6">
        <CrmBoard
          initialDeals={deals}
          initialClients={clients}
          userPlan={plan.id}
        />
      </div>
    </div>
  );
}
