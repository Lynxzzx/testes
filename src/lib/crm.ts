export type CrmStage = "lead" | "created" | "sent" | "negotiation" | "won" | "lost";
export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadSource =
  | "instagram"
  | "indicacao"
  | "whatsapp"
  | "google"
  | "prospeccao"
  | "outro";

export const CRM_STAGES: {
  id: CrmStage;
  label: string;
  shortLabel: string;
  accentClass: string;
  dotClass: string;
}[] = [
  {
    id: "lead",
    label: "Novo Lead / Briefing",
    shortLabel: "Novo Lead",
    accentClass: "border-slate-300 bg-slate-50/70",
    dotClass: "bg-slate-400",
  },
  {
    id: "created",
    label: "Proposta Criada",
    shortLabel: "Criada",
    accentClass: "border-indigo-200 bg-indigo-50/40",
    dotClass: "bg-indigo-500",
  },
  {
    id: "sent",
    label: "Enviada / Aguardando",
    shortLabel: "Enviada",
    accentClass: "border-sky-200 bg-sky-50/40",
    dotClass: "bg-sky-500",
  },
  {
    id: "negotiation",
    label: "Em Negociação",
    shortLabel: "Em Negociação",
    accentClass: "border-amber-200 bg-amber-50/40",
    dotClass: "bg-amber-500",
  },
  {
    id: "won",
    label: "Fechado (Ganho)",
    shortLabel: "Ganho",
    accentClass: "border-emerald-200 bg-emerald-50/40",
    dotClass: "bg-emerald-500",
  },
  {
    id: "lost",
    label: "Perdido",
    shortLabel: "Perdido",
    accentClass: "border-rose-200 bg-rose-50/30",
    dotClass: "bg-rose-500",
  },
];

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google / Site" },
  { value: "prospeccao", label: "Prospecção ativa" },
  { value: "outro", label: "Outro" },
];

export const LOST_REASONS = [
  "Preço acima do orçamento",
  "Prazo incompatível",
  "Sumiu / Sem resposta",
  "Fechou com concorrente",
  "Projeto adiado pelo cliente",
  "Outro motivo",
] as const;

export const TEMPERATURES: Record<
  LeadTemperature,
  { label: string; badgeClass: string }
> = {
  cold: {
    label: "Frio ❄️",
    badgeClass: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  },
  warm: {
    label: "Morno 🌤️",
    badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  },
  hot: {
    label: "Quente 🔥",
    badgeClass: "border-orange-500/30 bg-orange-500/15 text-orange-700",
  },
};

/**
 * Resolve a etapa do CRM com total retrocompatibilidade para propostas antigas.
 */
export function resolveCrmStage(proposal: {
  crmStage?: string | null;
  status?: string | null;
  viewCount?: number | null;
}): CrmStage {
  if (proposal.status === "approved" || proposal.status === "final") return "won";
  if (proposal.status === "rejected") return "lost";

  const stage = proposal.crmStage as CrmStage | undefined;
  if (stage && ["lead", "created", "sent", "negotiation", "won", "lost"].includes(stage)) {
    // Se ainda estava como "created" mas o status já mudou para "sent" ou já teve visualização, promove
    if (stage === "created" && (proposal.status === "sent" || (proposal.viewCount ?? 0) > 0)) {
      return "sent";
    }
    return stage;
  }

  if (proposal.status === "sent" || (proposal.viewCount ?? 0) > 0) return "sent";
  return "created";
}

/**
 * Converte uma etapa do CRM para o `status` equivalente da proposta.
 */
export function stageToProposalStatus(
  stage: CrmStage
): "draft" | "sent" | "approved" | "rejected" {
  switch (stage) {
    case "won":
      return "approved";
    case "lost":
      return "rejected";
    case "sent":
    case "negotiation":
      return "sent";
    case "lead":
    case "created":
    default:
      return "draft";
  }
}

/**
 * Resolve a temperatura do lead (promovendo automaticamente para Quente 🔥 se foi
 * visualizado recentemente pelo cliente nas últimas 72h).
 */
export function resolveLeadTemperature(proposal: {
  temperature?: string | null;
  lastViewedAt?: Date | string | null;
  status?: string | null;
}): LeadTemperature {
  if (proposal.lastViewedAt) {
    const viewedMs =
      typeof proposal.lastViewedAt === "string"
        ? new Date(proposal.lastViewedAt).getTime()
        : proposal.lastViewedAt.getTime();
    if (Date.now() - viewedMs < 72 * 3600_000) {
      return "hot";
    }
  }
  const t = proposal.temperature as LeadTemperature | undefined;
  if (t === "cold" || t === "warm" || t === "hot") return t;
  return "warm";
}

export function isViewedRecently(lastViewedAt?: Date | string | null): boolean {
  if (!lastViewedAt) return false;
  const ms =
    typeof lastViewedAt === "string"
      ? new Date(lastViewedAt).getTime()
      : lastViewedAt.getTime();
  return Date.now() - ms < 48 * 3600_000;
}
