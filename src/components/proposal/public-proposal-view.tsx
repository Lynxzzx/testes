"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractProposalTotalBrl, formatBrl } from "@/lib/proposal-charts";
import { formatDate } from "@/lib/utils";

type PublicProposalProps = {
  id: string;
  title: string;
  clientName: string;
  content: string;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  approvedByName?: string;
  watermark: boolean;
  company: {
    name?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    responsible?: string;
    logo?: string;
    brandColor?: string;
  };
};

export function PublicProposalView({ proposal }: { proposal: PublicProposalProps }) {
  const [status, setStatus] = useState(proposal.status);
  const [approvedAt, setApprovedAt] = useState(proposal.approvedAt ?? null);
  const [approvedBy, setApprovedBy] = useState(proposal.approvedByName ?? "");
  const [name, setName] = useState(proposal.clientName || "");
  const [email, setEmail] = useState("");
  const [approving, setApproving] = useState(false);

  const isApproved = status === "approved" || status === "final";
  const c = proposal.company;
  const brandColor =
    c?.brandColor && /^#[0-9a-fA-F]{6}$/.test(c.brandColor) ? c.brandColor : "#4f46e5";
  const totalBrl = extractProposalTotalBrl(proposal.content);
  const contactLine = [c?.email, c?.phone, c?.website].filter(Boolean).join("  ·  ");

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setApproving(true);
    try {
      const res = await fetch(`/api/public/proposals/${proposal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível registrar o aceite.");
      setStatus("approved");
      setApprovedAt(data.approvedAt ?? new Date().toISOString());
      if (data.approvedByName) setApprovedBy(data.approvedByName);
      toast.success("Proposta aprovada com sucesso!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setApproving(false);
    }
  }

  const cleanPhone = (c?.phone ?? "").replace(/\D/g, "");
  const whatsHref = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(
        `Olá! Acabei de aprovar a proposta "${proposal.title}". Vamos alinhar os próximos passos!`
      )}`
    : null;

  return (
    <div className="min-h-dvh bg-slate-50/70 pb-16">
      {/* Barra superior fixa otimizada para mobile e desktop */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {c?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logo}
                alt={c.name || "Logo"}
                className="max-h-8 max-w-[110px] object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {c?.name || proposal.title}
              </p>
              <p className="truncate text-xs text-slate-500">
                Emitida em {formatDate(proposal.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/public/proposals/${proposal.id}/pdf`}>
                <Download className="size-4" />
                <span className="hidden sm:inline">Baixar PDF</span>
              </a>
            </Button>

            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="size-4" />
                Proposta Aprovada
              </span>
            ) : (
              <Button
                size="sm"
                style={{ backgroundColor: brandColor }}
                className="text-white hover:opacity-90"
                asChild
              >
                <a href="#aceite-proposta">
                  <CheckCircle2 className="size-4" />
                  Aprovar Proposta
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Folha principal da proposta */}
      <main className="mx-auto mt-6 max-w-4xl px-4 sm:mt-10 sm:px-6">
        <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {/* Cabeçalho institucional */}
          <div
            className="flex flex-col justify-between gap-3 border-b px-6 py-6 sm:flex-row sm:items-center sm:px-12"
            style={{ borderBottomColor: brandColor }}
          >
            <div className="flex items-center gap-3.5">
              {c?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo} alt="" className="max-h-10 max-w-[130px] object-contain" />
              ) : null}
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {c?.name || "Proposta Comercial"}
                </h2>
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: brandColor }}
                >
                  Proposta Comercial
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 sm:text-right">
              {c?.cnpj && <p className="font-medium text-slate-700">CNPJ: {c.cnpj}</p>}
              {c?.address && <p>{c.address}</p>}
              {c?.responsible && <p>Resp.: {c.responsible}</p>}
            </div>
          </div>

          {/* Conteúdo renderizado */}
          <div className="px-6 py-8 sm:px-12 sm:py-12">
            <div
              className="mb-5 h-1.5 w-12 rounded-full"
              style={{ backgroundColor: brandColor }}
            />
            <Markdown content={proposal.content} />
          </div>

          {/* Rodapé institucional */}
          <div className="flex flex-col items-center justify-between gap-2 border-t bg-slate-50/70 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:px-12">
            <span>{contactLine || c?.name || ""}</span>
            {proposal.watermark && (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Sparkles className="size-3" /> Gerado com PropostaAI
              </span>
            )}
          </div>
        </article>

        {/* Bloco de Aprovação em 1 Clique */}
        <section
          id="aceite-proposta"
          className="mt-8 scroll-mt-24 overflow-hidden rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
        >
          {isApproved ? (
            <div className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="size-7" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                Proposta Aprovada!
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-600">
                O aceite desta proposta foi registrado
                {approvedBy ? ` por ${approvedBy}` : ""}
                {approvedAt ? ` em ${formatDate(approvedAt, true)}` : ""}. A equipe de{" "}
                <strong>{c?.name || "atendimento"}</strong> já foi notificada.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <a href={`/api/public/proposals/${proposal.id}/pdf`}>
                    <Download className="size-4" /> Baixar cópia em PDF
                  </a>
                </Button>
                {whatsHref && (
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    asChild
                  >
                    <a href={whatsHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="size-4" /> Falar no WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleApprove} className="space-y-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    <ShieldCheck className="size-4" /> Aceite digital da proposta
                  </span>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">
                    De acordo com a proposta? Aprove em 1 clique
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Ao confirmar abaixo, o status da proposta muda imediatamente para{" "}
                    <strong>Aprovada</strong> para darmos início ao projeto.
                  </p>
                </div>
                {totalBrl > 0 && (
                  <div className="rounded-xl border bg-slate-50 px-4 py-2.5 sm:text-right">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Investimento total
                    </span>
                    <span
                      className="font-mono text-lg font-bold"
                      style={{ color: brandColor }}
                    >
                      {formatBrl(totalBrl)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome (opcional)"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail corporativo (opcional)"
                />
              </div>

              <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  disabled={approving}
                  style={{ backgroundColor: brandColor }}
                  className="text-white shadow-sm hover:opacity-95"
                >
                  {approving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                  Aprovar Proposta Agora
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
