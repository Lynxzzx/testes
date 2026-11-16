import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Lock, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProposalActions } from "@/components/dashboard/proposal-actions";
import { StatusBadge, type ProposalStatus } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/current-user";
import { TONES, type Tone } from "@/lib/plans";
import { getPlan, getUsage } from "@/lib/usage";
import { cn, formatDate } from "@/lib/utils";
import { Proposal } from "@/models/Proposal";

export const metadata: Metadata = { title: "Propostas" };

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "draft", label: "Rascunhos" },
  { value: "final", label: "Finalizadas" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const user = await getCurrentUser();
  const plan = getPlan(user);
  const usage = getUsage(user);

  const filter: Record<string, unknown> = { user: user._id };
  if (Number.isFinite(plan.historyDays)) {
    filter.createdAt = { $gte: new Date(Date.now() - plan.historyDays * 86_400_000) };
  }
  if (status === "draft" || status === "final") filter.status = status;
  if (q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { clientName: rx }];
  }

  const [proposals, hiddenCount] = await Promise.all([
    Proposal.find(filter)
      .select("title clientName status tone createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Number.isFinite(plan.historyDays)
      ? Proposal.countDocuments({
          user: user._id,
          createdAt: { $lt: new Date(Date.now() - plan.historyDays * 86_400_000) },
        })
      : Promise.resolve(0),
  ]);

  const isEmpty = proposals.length === 0 && !q && !status;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Propostas"
        description={
          usage.limit !== null
            ? `${usage.remaining} de ${usage.limit} propostas restantes este mês`
            : "Propostas ilimitadas no plano Pro"
        }
        actions={
          <Button asChild variant="brand">
            <Link href="/dashboard/propostas/nova">
              <Plus /> Nova proposta
            </Link>
          </Button>
        }
      />

      {isEmpty ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed bg-background px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border bg-muted/50">
            <FileText className="size-6 text-brand" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Nenhuma proposta ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Cole o brief de um cliente e gere sua primeira proposta comercial profissional em menos de 2 minutos.
          </p>
          <Button asChild variant="brand" className="mt-6">
            <Link href="/dashboard/propostas/nova">
              <Plus /> Criar primeira proposta
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-lg border bg-background p-1">
              {FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={{ pathname: "/dashboard", query: { ...(q ? { q } : {}), ...(f.value ? { status: f.value } : {}) } }}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    status === f.value && "bg-accent font-medium text-foreground"
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <form className="relative sm:w-72">
              {status && <input type="hidden" name="status" value={status} />}
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="Buscar por título ou cliente" className="bg-background pl-9" />
            </form>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border bg-background">
            <div className="hidden grid-cols-[1fr_140px_120px_130px_44px] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
              <span>Proposta</span>
              <span>Tom</span>
              <span>Status</span>
              <span>Criada em</span>
              <span />
            </div>
            {proposals.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma proposta encontrada.</p>
            ) : (
              <ul className="divide-y">
                {proposals.map((p) => {
                  const id = p._id.toString();
                  return (
                    <li
                      key={id}
                      className="group grid grid-cols-[1fr_44px] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-[1fr_140px_120px_130px_44px]"
                    >
                      <Link href={`/dashboard/propostas/${id}`} className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-brand">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.clientName || "Cliente não informado"}
                          <span className="md:hidden"> · {formatDate(p.createdAt)}</span>
                        </p>
                      </Link>
                      <span className="hidden text-sm text-muted-foreground md:block">
                        {TONES[p.tone as Tone]?.label ?? "—"}
                      </span>
                      <span className="col-start-1 row-start-2 md:col-auto md:row-auto">
                        <StatusBadge status={p.status as ProposalStatus} />
                      </span>
                      <span className="hidden text-sm text-muted-foreground md:block">{formatDate(p.createdAt)}</span>
                      <span className="col-start-2 row-span-2 row-start-1 md:col-auto md:row-auto">
                        <ProposalActions id={id} title={p.title} hasContent={p.status === "draft" || p.status === "final"} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hiddenCount > 0 && (
            <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4" />
                {hiddenCount} proposta{hiddenCount > 1 ? "s" : ""} com mais de 30 dias. Desbloqueie o histórico completo
                no Pro.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/plano">Ver plano Pro</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
