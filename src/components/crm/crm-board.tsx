"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  Kanban,
  LayoutList,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CRM_STAGES,
  isViewedRecently,
  LEAD_SOURCES,
  LOST_REASONS,
  TEMPERATURES,
  type CrmStage,
  type LeadSource,
  type LeadTemperature,
} from "@/lib/crm";
import { formatBrl } from "@/lib/proposal-charts";
import { cn, formatDate } from "@/lib/utils";

export type CrmDealItem = {
  id: string;
  clientId?: string | null;
  title: string;
  clientName: string;
  crmStage: CrmStage;
  status: string;
  dealValue: number;
  temperature: LeadTemperature;
  viewCount: number;
  lastViewedAt?: string | null;
  sentAt?: string | null;
  approvedAt?: string | null;
  signerName?: string;
  lostReason?: string;
  lostNotes?: string;
  nextFollowUpAt?: string | null;
  nextFollowUpTask?: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmClientItem = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
  source: LeadSource;
  tags: string[];
  notes: string;
  temperature: LeadTemperature;
  createdAt: string;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
};

type PeriodFilter = "month" | "30d" | "all";
type ActiveTab = "kanban" | "list" | "clients";

function isFollowUpOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr).getTime();
  return target < Date.now();
}

export function CrmBoard({
  initialDeals,
  initialClients,
  userPlan,
}: {
  initialDeals: CrmDealItem[];
  initialClients: CrmClientItem[];
  userPlan: "free" | "pro";
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<CrmDealItem[]>(initialDeals);
  const [clients, setClients] = useState<CrmClientItem[]>(initialClients);
  const [tab, setTab] = useState<ActiveTab>("kanban");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [search, setSearch] = useState("");

  // Drag & Drop state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CrmStage | null>(null);

  // Modal de Motivo da Perda (quando movido para "lost")
  const [lostModalDealId, setLostModalDealId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState("");

  // Modal de Novo Cliente / Lead
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);

  // Drawer Lateral de Ficha Completa do Negócio / Cliente
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedDealId) ?? null,
    [deals, selectedDealId]
  );

  const selectedClient = useMemo(() => {
    if (selectedClientId) {
      return clients.find((c) => c.id === selectedClientId) ?? null;
    }
    if (selectedDeal) {
      return (
        clients.find(
          (c) =>
            (selectedDeal.clientId && c.id === selectedDeal.clientId) ||
            (selectedDeal.clientName &&
              (c.name.toLowerCase() === selectedDeal.clientName.toLowerCase() ||
                c.company.toLowerCase() === selectedDeal.clientName.toLowerCase()))
        ) ?? null
      );
    }
    return null;
  }, [clients, selectedClientId, selectedDeal]);

  // Filtro por período e busca
  const filteredDeals = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const last30d = Date.now() - 30 * 86_400_000;
    const q = search.trim().toLowerCase();

    return deals.filter((d) => {
      const createdMs = new Date(d.createdAt).getTime();
      if (period === "month" && createdMs < startOfMonth) return false;
      if (period === "30d" && createdMs < last30d) return false;
      if (q) {
        const hay = `${d.title} ${d.clientName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deals, period, search]);

  // 4 KPIs de Inteligência Comercial
  const kpis = useMemo(() => {
    const openDeals = filteredDeals.filter(
      (d) => d.crmStage === "sent" || d.crmStage === "negotiation"
    );
    const wonDeals = filteredDeals.filter((d) => d.crmStage === "won");
    const sentOrDecided = filteredDeals.filter((d) =>
      ["sent", "negotiation", "won", "lost"].includes(d.crmStage)
    );

    const openPipelineBrl = openDeals.reduce((s, d) => s + (d.dealValue || 0), 0);
    const closedRevenueBrl = wonDeals.reduce((s, d) => s + (d.dealValue || 0), 0);
    const conversionRate =
      sentOrDecided.length > 0
        ? Math.round((wonDeals.length / sentOrDecided.length) * 100)
        : 0;
    const avgTicketBrl =
      wonDeals.length > 0 ? closedRevenueBrl / wonDeals.length : 0;

    // Ciclo médio de fechamento (dias entre criação/envio e aprovação)
    let cycleSumDays = 0;
    let cycleCount = 0;
    for (const d of wonDeals) {
      const startMs = new Date(d.sentAt || d.createdAt).getTime();
      const endMs = new Date(d.approvedAt || d.updatedAt).getTime();
      if (endMs >= startMs) {
        cycleSumDays += Math.max(1, Math.round((endMs - startMs) / 86_400_000));
        cycleCount++;
      }
    }
    const avgCycleDays =
      cycleCount > 0 ? Math.round(cycleSumDays / cycleCount) : null;

    return {
      openPipelineBrl,
      openCount: openDeals.length,
      closedRevenueBrl,
      wonCount: wonDeals.length,
      conversionRate,
      avgTicketBrl,
      avgCycleDays,
    };
  }, [filteredDeals]);

  async function moveDealStage(
    dealId: string,
    targetStage: CrmStage,
    extra?: { lostReason?: string; lostNotes?: string }
  ) {
    const current = deals.find((d) => d.id === dealId);
    if (!current || current.crmStage === targetStage) return;

    // Se moveu para Perdido sem motivo ainda, abre o mini-modal
    if (targetStage === "lost" && !extra?.lostReason) {
      setLostModalDealId(dealId);
      setLostReason(LOST_REASONS[0]);
      setLostNotes("");
      return;
    }

    // Atualização otimista
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              crmStage: targetStage,
              ...(extra?.lostReason ? { lostReason: extra.lostReason } : {}),
              ...(extra?.lostNotes ? { lostNotes: extra.lostNotes } : {}),
            }
          : d
      )
    );

    try {
      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crmStage: targetStage,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar etapa no funil.");
      const stageLabel =
        CRM_STAGES.find((s) => s.id === targetStage)?.shortLabel ?? targetStage;
      toast.success(`Movido para "${stageLabel}"!`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      router.refresh();
    }
  }

  async function updateDealPatch(dealId: string, patch: Partial<CrmDealItem>) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, ...patch } : d))
    );
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Não foi possível salvar.");
      toast.success("Negócio atualizado!");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Barra de Filtros de Período e Ações */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-lg border bg-background p-1">
          {[
            { id: "all" as const, label: "Todo o período" },
            { id: "month" as const, label: "Mês atual" },
            { id: "30d" as const, label: "Últimos 30 dias" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                period === p.id && "bg-accent text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar negócio ou cliente..."
              className="h-9 bg-background pl-9 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNewClientModalOpen(true)}
          >
            <UserPlus className="size-4" />
            Novo Lead / Cliente
          </Button>

          <Button asChild variant="brand" size="sm">
            <Link href="/dashboard/propostas/nova">
              <Plus className="size-4" />
              Nova Proposta
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. 4 KPIs de Inteligência Comercial */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-background p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">
              Pipeline aberto (Na mesa)
            </span>
            <Clock className="size-4 text-sky-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
            {formatBrl(kpis.openPipelineBrl)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kpis.openCount} proposta(s) em Enviada / Negociação
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="font-medium uppercase tracking-wider">
              Receita fechada (Ganho)
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-emerald-800">
            {formatBrl(kpis.closedRevenueBrl)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kpis.wonCount} contrato(s) fechado(s) no período
          </p>
        </div>

        <div className="rounded-xl border bg-background p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">
              Taxa de conversão
            </span>
            <TrendingUp className="size-4 text-brand" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
            {kpis.conversionRate}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.min(100, kpis.conversionRate)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-background p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">
              Ticket & Ciclo médio
            </span>
            <Sparkles className="size-4 text-violet-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
            {formatBrl(kpis.avgTicketBrl)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ciclo médio:{" "}
            <strong>
              {kpis.avgCycleDays !== null ? `${kpis.avgCycleDays} dia(s)` : "—"}
            </strong>{" "}
            até o aceite
          </p>
        </div>
      </div>

      {/* 3. Alternador de Visão: Kanban | Lista | Clientes */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="inline-flex rounded-lg border bg-background p-1">
          <button
            type="button"
            onClick={() => setTab("kanban")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              tab === "kanban" && "bg-accent text-foreground"
            )}
          >
            <Kanban className="size-3.5" /> Funil Kanban
          </button>
          <button
            type="button"
            onClick={() => setTab("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              tab === "list" && "bg-accent text-foreground"
            )}
          >
            <LayoutList className="size-3.5" /> Visão em Lista
          </button>
          <button
            type="button"
            onClick={() => setTab("clients")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              tab === "clients" && "bg-accent text-foreground"
            )}
          >
            <Users className="size-3.5" /> Base de Clientes ({clients.length})
          </button>
        </div>

        <span className="hidden text-xs text-muted-foreground md:inline">
          Arraste os cards entre as etapas ou clique para abrir a ficha completa
        </span>
      </div>

      {/* VISÃO 1: FUNIL KANBAN DRAG-AND-DROP */}
      {tab === "kanban" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {CRM_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.crmStage === stage.id);
            const stageTotal = stageDeals.reduce((s, d) => s + (d.dealValue || 0), 0);
            const isOver = dragOverStage === stage.id;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStage !== stage.id) setDragOverStage(stage.id);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  if (draggedDealId) {
                    moveDealStage(draggedDealId, stage.id);
                    setDraggedDealId(null);
                  }
                }}
                className={cn(
                  "flex min-h-[460px] flex-col rounded-xl border p-2.5 transition-all",
                  stage.accentClass,
                  isOver && "ring-2 ring-brand"
                )}
              >
                {/* Cabeçalho da coluna com quantidade e soma em R$ */}
                <div className="mb-2.5 rounded-lg border bg-background/90 p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className={cn("size-2 rounded-full", stage.dotClass)} />
                      {stage.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs font-semibold text-muted-foreground">
                    {formatBrl(stageTotal)}
                  </p>
                </div>

                {/* Cards da coluna */}
                <div className="flex-1 space-y-2.5">
                  {stageDeals.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed bg-background/40 p-3 text-center text-[11px] text-muted-foreground">
                      Arraste um negócio para cá
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const viewedRecent = isViewedRecently(deal.lastViewedAt);
                      const overdue = isFollowUpOverdue(deal.nextFollowUpAt);
                      const tempInfo = TEMPERATURES[deal.temperature] ?? TEMPERATURES.warm;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={() => setDraggedDealId(deal.id)}
                          onDragEnd={() => {
                            setDraggedDealId(null);
                            setDragOverStage(null);
                          }}
                          onClick={() => {
                            setSelectedClientId(null);
                            setSelectedDealId(deal.id);
                          }}
                          className="group cursor-pointer rounded-xl border bg-background p-3 shadow-xs transition-all hover:border-brand/50 hover:shadow-md active:cursor-grabbing"
                        >
                          {/* Selos superiores: Visualizado recentemente + Temperatura */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                                tempInfo.badgeClass
                              )}
                            >
                              {tempInfo.label}
                            </span>

                            {viewedRecent ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                <span className="size-1.5 animate-ping rounded-full bg-sky-500" />
                                Visualizado recentemente
                              </span>
                            ) : deal.viewCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700">
                                <Eye className="size-3" /> {deal.viewCount}x
                              </span>
                            ) : null}
                          </div>

                          <h4 className="mt-2 line-clamp-2 text-xs font-semibold leading-snug group-hover:text-brand">
                            {deal.title}
                          </h4>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {deal.clientName || "Cliente não informado"}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between border-t pt-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {deal.dealValue > 0 ? formatBrl(deal.dealValue) : "R$ —"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(deal.createdAt)}
                            </span>
                          </div>

                          {deal.nextFollowUpAt && (
                            <div
                              className={cn(
                                "mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium",
                                overdue
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <Calendar className="size-3 shrink-0" />
                              <span className="truncate">
                                {overdue ? "Atrasado: " : "Follow-up: "}
                                {deal.nextFollowUpTask || formatDate(deal.nextFollowUpAt)}
                              </span>
                            </div>
                          )}

                          {deal.crmStage === "lost" && deal.lostReason && (
                            <p className="mt-1.5 truncate text-[10px] font-medium text-rose-600">
                              Motivo: {deal.lostReason}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISÃO 2: TABELA / LISTA */}
      {tab === "list" && (
        <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
          <div className="hidden grid-cols-[1.5fr_1fr_140px_110px_130px_100px] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Negócio / Proposta</span>
            <span>Cliente</span>
            <span>Etapa no Funil</span>
            <span>Temperatura</span>
            <span>Valor (R$)</span>
            <span>Leituras</span>
          </div>
          {filteredDeals.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum negócio encontrado neste período.
            </p>
          ) : (
            <ul className="divide-y">
              {filteredDeals.map((deal) => {
                const tempInfo = TEMPERATURES[deal.temperature] ?? TEMPERATURES.warm;
                return (
                  <li
                    key={deal.id}
                    onClick={() => {
                      setSelectedClientId(null);
                      setSelectedDealId(deal.id);
                    }}
                    className="grid cursor-pointer grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-[1.5fr_1fr_140px_110px_130px_100px] md:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium hover:text-brand">
                        {deal.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {formatDate(deal.createdAt)}
                      </p>
                    </div>
                    <span className="truncate text-sm text-muted-foreground">
                      {deal.clientName || "—"}
                    </span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={deal.crmStage}
                        onChange={(e) =>
                          moveDealStage(deal.id, e.target.value as CrmStage)
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs font-medium"
                      >
                        {CRM_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.shortLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span>
                      <span
                        className={cn(
                          "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                          tempInfo.badgeClass
                        )}
                      >
                        {tempInfo.label}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-semibold">
                      {deal.dealValue > 0 ? formatBrl(deal.dealValue) : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {deal.viewCount > 0 ? `${deal.viewCount}x aberto` : "Não aberto"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* VISÃO 3: BASE UNIFICADA DE CLIENTES (COM LTV) */}
      {tab === "clients" && (
        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-background px-6 py-14 text-center">
              <Users className="size-10 text-brand" />
              <h3 className="mt-4 text-base font-semibold">
                Sua base de clientes está vazia
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Cadastre clientes manualmente ou gere uma nova proposta — o cliente é
                vinculado automaticamente ao CRM.
              </p>
              <Button
                type="button"
                variant="brand"
                size="sm"
                className="mt-5"
                onClick={() => setNewClientModalOpen(true)}
              >
                <UserPlus className="size-4" /> Cadastrar primeiro cliente
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => {
                const clientDeals = deals.filter(
                  (d) =>
                    d.clientId === client.id ||
                    (d.clientName &&
                      (d.clientName.toLowerCase() === client.name.toLowerCase() ||
                        d.clientName.toLowerCase() === client.company.toLowerCase()))
                );
                const wonLtv = clientDeals
                  .filter((d) => d.crmStage === "won")
                  .reduce((s, d) => s + (d.dealValue || 0), 0);
                const openValue = clientDeals
                  .filter((d) => !["won", "lost"].includes(d.crmStage))
                  .reduce((s, d) => s + (d.dealValue || 0), 0);
                const tempInfo =
                  TEMPERATURES[client.temperature] ?? TEMPERATURES.warm;
                const sourceLabel =
                  LEAD_SOURCES.find((s) => s.value === client.source)?.label ??
                  "Outro";

                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      const firstDeal = clientDeals[0];
                      setSelectedClientId(client.id);
                      setSelectedDealId(firstDeal?.id ?? null);
                    }}
                    className="flex cursor-pointer flex-col justify-between rounded-xl border bg-background p-5 shadow-xs transition-all hover:border-brand/50 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Origem: {sourceLabel}
                        </span>
                        <span
                          className={cn(
                            "rounded border px-2 py-0.5 text-[10px] font-semibold",
                            tempInfo.badgeClass
                          )}
                        >
                          {tempInfo.label}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-semibold">
                        {client.company || client.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {client.name}
                        {client.role ? ` · ${client.role}` : ""}
                      </p>

                      {client.tags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {client.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 border-t pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LTV (Total fechado):</span>
                        <strong className="font-mono text-emerald-700">
                          {formatBrl(wonLtv)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Em aberto:</span>
                        <strong className="font-mono">{formatBrl(openValue)}</strong>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground">
                          {clientDeals.length} proposta(s)
                        </span>
                        <Link
                          href={`/dashboard/propostas/nova?clientName=${encodeURIComponent(
                            client.company || client.name
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                        >
                          <FilePlus2 className="size-3.5" /> Nova proposta
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MINI-MODAL: MOTIVO DA PERDA */}
      {lostModalDealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold">
                Por que este negócio foi perdido?
              </h3>
              <button
                type="button"
                onClick={() => setLostModalDealId(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Selecione o motivo principal</Label>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {LOST_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setLostReason(reason)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all",
                        lostReason === reason
                          ? "border-rose-500 bg-rose-500/10 text-rose-700"
                          : "hover:bg-accent"
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observação interna (opcional)</Label>
                <Textarea
                  rows={2}
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Ex.: Cliente pediu para retomar contato em janeiro..."
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLostModalDealId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const id = lostModalDealId;
                    setLostModalDealId(null);
                    moveDealStage(id, "lost", {
                      lostReason,
                      lostNotes,
                    });
                  }}
                >
                  Confirmar Perda
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CLIENTE / LEAD */}
      {newClientModalOpen && (
        <NewClientModal
          onClose={() => setNewClientModalOpen(false)}
          onCreated={(newClient, createdDeal) => {
            setClients((prev) => [newClient, ...prev]);
            if (createdDeal) setDeals((prev) => [createdDeal, ...prev]);
            setNewClientModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* DRAWER LATERAL: FICHA COMPLETA DO NEGÓCIO / CLIENTE */}
      {(selectedDeal || selectedClient) && (
        <DealClientDrawer
          deal={selectedDeal}
          client={selectedClient}
          allDeals={deals}
          userPlan={userPlan}
          onClose={() => {
            setSelectedDealId(null);
            setSelectedClientId(null);
          }}
          onSelectDeal={(id) => setSelectedDealId(id)}
          onUpdateDeal={updateDealPatch}
          onMoveStage={(id, stage) => moveDealStage(id, stage)}
        />
      )}
    </div>
  );
}

function NewClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: CrmClientItem, deal?: CrmDealItem) => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [source, setSource] = useState<LeadSource>("whatsapp");
  const [tagsText, setTagsText] = useState("");
  const [notes, setNotes] = useState("");
  const [createLeadDeal, setCreateLeadDeal] = useState(true);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const numericValue = Number.parseFloat(dealValue) || 0;
      const res = await fetch("/api/crm/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company: company || name,
          phone,
          email,
          role,
          source,
          tags,
          notes,
          createLeadDeal,
          dealTitle: dealTitle || `Projeto — ${company || name}`,
          dealValue: numericValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar cliente.");

      const createdClient: CrmClientItem = {
        ...data.client,
        createdAt: new Date().toISOString(),
      };
      const createdDeal: CrmDealItem | undefined = data.dealId
        ? {
            id: data.dealId,
            clientId: createdClient.id,
            title: dealTitle || `Projeto — ${company || name}`,
            clientName: company || name,
            crmStage: "lead",
            status: "draft",
            dealValue: numericValue,
            temperature: "warm",
            viewCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : undefined;

      toast.success("Cliente cadastrado no CRM!");
      onCreated(createdClient, createdDeal);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-semibold">Novo Cliente / Lead no CRM</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do contato *</Label>
              <Input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Dr. Paulo Soares"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex.: Rede Sorriso"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp / Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(41) 99999-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="paulo@empresa.com.br"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cargo</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Sócio-diretor"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Origem do Lead</Label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tags (separadas por vírgula)</Label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Saúde, Site, Alta prioridade"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notas internas / Briefing preliminar</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a necessidade do cliente..."
            />
          </div>

          <div className="rounded-xl border bg-muted/30 p-3.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={createLeadDeal}
                onChange={(e) => setCreateLeadDeal(e.target.checked)}
                className="size-4 rounded border"
              />
              Criar card de oportunidade na coluna &ldquo;Novo Lead / Briefing&rdquo;
            </label>

            {createLeadDeal && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Título do negócio</Label>
                  <Input
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="Ex.: Novo Site + SEO"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Valor estimado (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    placeholder="18000"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Salvar no CRM
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DealClientDrawer({
  deal,
  client,
  allDeals,
  userPlan,
  onClose,
  onSelectDeal,
  onUpdateDeal,
  onMoveStage,
}: {
  deal: CrmDealItem | null;
  client: CrmClientItem | null;
  allDeals: CrmDealItem[];
  userPlan: "free" | "pro";
  onClose: () => void;
  onSelectDeal: (id: string) => void;
  onUpdateDeal: (dealId: string, patch: Partial<CrmDealItem>) => Promise<void>;
  onMoveStage: (dealId: string, stage: CrmStage) => void;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Follow-up state
  const [followDate, setFollowDate] = useState(
    deal?.nextFollowUpAt ? deal.nextFollowUpAt.slice(0, 10) : ""
  );
  const [followTask, setFollowTask] = useState(deal?.nextFollowUpTask || "");
  const [editValue, setEditValue] = useState(String(deal?.dealValue ?? 0));

  // Gerador de Follow-up com IA
  const [aiFollowUp, setAiFollowUp] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  useEffect(() => {
    setFollowDate(deal?.nextFollowUpAt ? deal.nextFollowUpAt.slice(0, 10) : "");
    setFollowTask(deal?.nextFollowUpTask || "");
    setEditValue(String(deal?.dealValue ?? 0));
    setAiFollowUp("");
  }, [deal?.id, deal?.nextFollowUpAt, deal?.nextFollowUpTask, deal?.dealValue]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (deal?.id) params.set("proposalId", deal.id);
    if (client?.id) params.set("clientId", client.id);
    if (!params.toString()) return;

    setLoadingAct(true);
    fetch(`/api/crm/activities?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.activities) setActivities(data.activities);
      })
      .catch(() => {})
      .finally(() => setLoadingAct(false));
  }, [deal?.id, client?.id]);

  // Calcula o LTV do cliente
  const clientNameKey = (
    client?.company ||
    client?.name ||
    deal?.clientName ||
    ""
  ).toLowerCase();

  const relatedDeals = useMemo(() => {
    return allDeals.filter(
      (d) =>
        (client?.id && d.clientId === client.id) ||
        (clientNameKey && d.clientName.toLowerCase() === clientNameKey) ||
        (deal && d.id === deal.id)
    );
  }, [allDeals, client?.id, clientNameKey, deal]);

  const ltvClosed = relatedDeals
    .filter((d) => d.crmStage === "won")
    .reduce((s, d) => s + (d.dealValue || 0), 0);
  const ltvOpen = relatedDeals
    .filter((d) => !["won", "lost"].includes(d.crmStage))
    .reduce((s, d) => s + (d.dealValue || 0), 0);

  async function handleGenerateFollowUp() {
    if (!deal) return;
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/crm/followup-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: deal.id,
          origin: window.location.origin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.message) {
        throw new Error(data.error ?? "Erro ao gerar mensagem.");
      }
      setAiFollowUp(data.message);
      toast.success("Mensagem de follow-up gerada com IA!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: deal?.id,
          clientId: client?.id,
          title: noteText.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.activity) throw new Error("Erro ao salvar nota.");
      setActivities((prev) => [data.activity, ...prev]);
      setNoteText("");
      toast.success("Nota registrada no histórico!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAddingNote(false);
    }
  }

  const cleanPhone = (client?.phone ?? "").replace(/\D/g, "");
  const whatsUrl = aiFollowUp
    ? `https://wa.me/${
        cleanPhone ? (cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`) : ""
      }?text=${encodeURIComponent(aiFollowUp)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div className="flex h-dvh w-full max-w-xl flex-col overflow-hidden border-l bg-background shadow-2xl">
        {/* Cabeçalho do Drawer */}
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              Ficha Comercial Completa
            </span>
            <h2 className="mt-0.5 truncate text-lg font-semibold">
              {deal?.title || client?.company || client?.name}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              Cliente: {client?.company || client?.name || deal?.clientName || "Não informado"}
              {client?.phone ? ` · ${client.phone}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* 1. Etapa no Funil + Termômetro do Lead */}
          {deal && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Etapa no Funil</Label>
                <select
                  value={deal.crmStage}
                  onChange={(e) => onMoveStage(deal.id, e.target.value as CrmStage)}
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-xs font-semibold"
                >
                  {CRM_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Termômetro do Lead</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["cold", "warm", "hot"] as LeadTemperature[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onUpdateDeal(deal.id, { temperature: t })}
                      className={cn(
                        "rounded-md border py-1.5 text-center text-xs font-semibold transition-all",
                        deal.temperature === t
                          ? TEMPERATURES[t].badgeClass
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {TEMPERATURES[t].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Resumo Financeiro do Cliente (LTV) + Valor do Negócio */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resumo Financeiro do Cliente (LTV)
            </span>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-background p-2.5">
                <span className="block text-[10px] text-muted-foreground">
                  Total Fechado
                </span>
                <strong className="font-mono text-sm text-emerald-700">
                  {formatBrl(ltvClosed)}
                </strong>
              </div>
              <div className="rounded-lg border bg-background p-2.5">
                <span className="block text-[10px] text-muted-foreground">
                  Em Aberto
                </span>
                <strong className="font-mono text-sm">{formatBrl(ltvOpen)}</strong>
              </div>
              <div className="rounded-lg border bg-background p-2.5">
                <span className="block text-[10px] text-muted-foreground">
                  Propostas
                </span>
                <strong className="font-mono text-sm">{relatedDeals.length}</strong>
              </div>
            </div>

            {deal && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Valor deste negócio (R$):
                </span>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 w-32 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      onUpdateDeal(deal.id, {
                        dealValue: Number.parseFloat(editValue) || 0,
                      })
                    }
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Gerador de Mensagem de Follow-up com IA (1 clique) */}
          {deal && (
            <div className="rounded-xl border border-brand/25 bg-brand/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="size-3.5 text-brand" />
                    Follow-up Inteligente no WhatsApp
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {deal.viewCount > 0
                      ? `Cliente já visualizou a proposta ${deal.viewCount}x`
                      : "Cliente ainda não abriu o link interativo"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={generatingAi}
                  onClick={handleGenerateFollowUp}
                >
                  {generatingAi ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <MessageCircle className="size-3.5" />
                  )}
                  Gerar cobrança no WhatsApp
                </Button>
              </div>

              {userPlan === "free" && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  No plano <strong>Pro</strong> você tem follow-ups com IA e histórico ilimitados.
                </p>
              )}

              {aiFollowUp && (
                <div className="mt-3 space-y-2.5">
                  <Textarea
                    rows={5}
                    value={aiFollowUp}
                    onChange={(e) => setAiFollowUp(e.target.value)}
                    className="bg-background text-xs leading-relaxed"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={async () => {
                        await navigator.clipboard.writeText(aiFollowUp);
                        setCopiedAi(true);
                        toast.success("Mensagem copiada!");
                        setTimeout(() => setCopiedAi(false), 2000);
                      }}
                    >
                      {copiedAi ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      Copiar texto
                    </Button>
                    {whatsUrl && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                        asChild
                      >
                        <a href={whatsUrl} target="_blank" rel="noopener noreferrer">
                          <Phone className="size-3.5" /> Enviar no WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Próxima Tarefa / Lembrete de Follow-up */}
          {deal && (
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                  <Calendar className="size-3.5 text-brand" />
                  Próxima tarefa / Lembrete de Follow-up
                </h3>
                {isFollowUpOverdue(deal.nextFollowUpAt) && (
                  <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    <AlertCircle className="size-3" /> Atrasado
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                <Input
                  type="date"
                  value={followDate}
                  onChange={(e) => setFollowDate(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  value={followTask}
                  onChange={(e) => setFollowTask(e.target.value)}
                  placeholder="Ex.: Cobrar retorno sobre orçamento"
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    onUpdateDeal(deal.id, {
                      nextFollowUpAt: followDate ? new Date(followDate).toISOString() : null,
                      nextFollowUpTask: followTask,
                    })
                  }
                >
                  Agendar
                </Button>
              </div>
            </div>
          )}

          {/* 5. Lista de Propostas Vinculadas */}
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                <FileText className="size-3.5 text-brand" />
                Propostas vinculadas ({relatedDeals.length})
              </h3>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-brand">
                <Link
                  href={`/dashboard/propostas/nova?clientName=${encodeURIComponent(
                    client?.company || client?.name || deal?.clientName || ""
                  )}`}
                >
                  <Plus className="size-3.5" /> Nova proposta
                </Link>
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {relatedDeals.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onSelectDeal(d.id)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors hover:bg-muted/40",
                    deal?.id === d.id && "border-brand/40 bg-brand/[0.03]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(d.createdAt)} ·{" "}
                      {d.dealValue > 0 ? formatBrl(d.dealValue) : "Valor a definir"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                      <Link href={`/dashboard/propostas/${d.id}`}>
                        Abrir <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Linha do Tempo de Atividades / Auditoria Comercial */}
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-xs font-semibold">
              Linha do Tempo & Histórico Comercial
            </h3>

            <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
              <Input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Registrar anotação de reunião, ligação ou WhatsApp..."
                className="h-8 text-xs"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                disabled={!noteText.trim() || addingNote}
              >
                <Send className="size-3.5" /> Anotar
              </Button>
            </form>

            <div className="mt-4 space-y-3">
              {loadingAct ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Carregando histórico…
                </p>
              ) : activities.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhuma atividade registrada ainda.
                </p>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="relative border-l-2 border-brand/30 pl-3 text-xs"
                  >
                    <p className="font-medium text-foreground">{act.title}</p>
                    {act.description && (
                      <p className="text-[11px] text-muted-foreground">
                        {act.description}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground/80">
                      {formatDate(act.createdAt, true)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
