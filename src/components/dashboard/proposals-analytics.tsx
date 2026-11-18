import { BarChart3, CheckCircle2, FileText, PieChart, Sparkles, TrendingUp } from "lucide-react";
import { TONES, type Tone } from "@/lib/plans";
import { extractProposalTotalBrl, formatBrl } from "@/lib/proposal-charts";

function isApprovedStatus(status?: string | null): boolean {
  return status === "approved" || status === "final";
}

type ProposalSummary = {
  status: string;
  tone?: string | null;
  content?: string | null;
  createdAt: Date | string;
};

export function ProposalsAnalytics({ proposals }: { proposals: ProposalSummary[] }) {
  if (proposals.length === 0) return null;

  const total = proposals.length;
  const approvedList = proposals.filter((p) => isApprovedStatus(p.status));
  const approved = approvedList.length;
  const sent = proposals.filter((p) => p.status === "sent").length;
  const drafts = proposals.filter((p) => p.status === "draft").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const approvalRate = Math.round((approved / Math.max(total, 1)) * 100);

  // Soma do valor fechado nas propostas aprovadas
  const closedValueBrl = approvedList.reduce(
    (sum, p) => sum + extractProposalTotalBrl(p.content || ""),
    0
  );

  // Contagem por tom de escrita
  const toneCounts: Record<Tone, number> = {
    consultivo: 0,
    formal: 0,
    direto: 0,
  };
  for (const p of proposals) {
    const t = (p.tone as Tone) || "consultivo";
    if (t in toneCounts) toneCounts[t]++;
  }

  // Evolução dos últimos 6 meses
  const now = new Date();
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(d)
      .replace(".", "");
    months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), count: 0 });
  }
  for (const p of proposals) {
    const d = typeof p.createdAt === "string" ? new Date(p.createdAt) : p.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.count++;
  }
  const maxMonthCount = Math.max(...months.map((m) => m.count), 1);

  const toneColors: Record<Tone, string> = {
    consultivo: "bg-brand",
    formal: "bg-violet-500",
    direto: "bg-emerald-500",
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Indicador discreto de Valor Total Fechado (exibido quando há propostas Aprovadas) */}
      {approved > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
              <TrendingUp className="size-4" />
            </span>
            <div>
              <p className="text-xs font-medium text-emerald-800">
                Negócios fechados ({approved} proposta{approved > 1 ? "s" : ""} aprovada
                {approved > 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground">
                Soma calculada automaticamente a partir das propostas marcadas como Aprovada
              </p>
            </div>
          </div>
          {closedValueBrl > 0 && (
            <div className="text-right">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Valor total fechado
              </span>
              <span className="font-mono text-lg font-semibold text-emerald-800">
                {formatBrl(closedValueBrl)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 1. Resumo & Funil de Status */}
        <div className="rounded-xl border bg-background p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Funil comercial
            </span>
            <FileText className="size-4 text-brand" />
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-semibold tracking-tight">{total}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">propostas</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3" /> {approvalRate}% aprovadas
            </span>
          </div>

          {/* Barra empilhada de status */}
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {approved > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(approved / total) * 100}%` }}
                title={`Aprovadas: ${approved}`}
              />
            )}
            {sent > 0 && (
              <div
                className="bg-brand transition-all"
                style={{ width: `${(sent / total) * 100}%` }}
                title={`Enviadas: ${sent}`}
              />
            )}
            {drafts > 0 && (
              <div
                className="bg-slate-400 transition-all"
                style={{ width: `${(drafts / total) * 100}%` }}
                title={`Rascunhos: ${drafts}`}
              />
            )}
            {rejected > 0 && (
              <div
                className="bg-rose-400 transition-all"
                style={{ width: `${(rejected / total) * 100}%` }}
                title={`Recusadas: ${rejected}`}
              />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Aprovadas: <strong className="text-foreground">{approved}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" />
              Enviadas: <strong className="text-foreground">{sent}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-400" />
              Rascunhos: <strong className="text-foreground">{drafts}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-400" />
              Recusadas: <strong className="text-foreground">{rejected}</strong>
            </span>
          </div>
        </div>

        {/* 2. Gráfico de Barras — Volume por Mês */}
        <div className="rounded-xl border bg-background p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Volume mensal (6 meses)
            </span>
            <BarChart3 className="size-4 text-brand" />
          </div>

          <div className="mt-4 grid h-28 grid-cols-6 items-end gap-2 pt-4">
            {months.map((m, idx) => {
              const heightPct = m.count > 0 ? Math.max((m.count / maxMonthCount) * 100, 16) : 6;
              const isCurrent = idx === months.length - 1;
              return (
                <div key={m.key} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="font-mono text-[10px] font-medium text-muted-foreground">
                    {m.count > 0 ? m.count : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        m.count === 0 ? "bg-muted" : isCurrent ? "bg-brand" : "bg-brand/45"
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${m.label}: ${m.count} proposta(s)`}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Distribuição por Tom de Escrita */}
        <div className="rounded-xl border bg-background p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Distribuição por tom
            </span>
            <PieChart className="size-4 text-brand" />
          </div>

          <div className="mt-4 space-y-3">
            {(Object.keys(TONES) as Tone[]).map((tone) => {
              const count = toneCounts[tone];
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tone} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="size-3 text-muted-foreground" />
                      {TONES[tone].label}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${toneColors[tone]}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
