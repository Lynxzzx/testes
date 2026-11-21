"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSignature,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import {
  SignatureModal,
  type SignatureResult,
} from "@/components/proposal/signature-modal";
import { Button } from "@/components/ui/button";
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
  signerName?: string;
  signerDocument?: string;
  signatureImage?: string;
  signedAt?: string | null;
  signerIp?: string;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [signature, setSignature] = useState<{
    signerName: string;
    signerDocument: string;
    signatureImage: string;
    signedAt: string | null;
    signerIp: string;
  }>({
    signerName: proposal.signerName || proposal.approvedByName || "",
    signerDocument: proposal.signerDocument || "",
    signatureImage: proposal.signatureImage || "",
    signedAt: proposal.signedAt || proposal.approvedAt || null,
    signerIp: proposal.signerIp || "",
  });

  const isApproved = status === "approved" || status === "final";
  const c = proposal.company;
  const brandColor =
    c?.brandColor && /^#[0-9a-fA-F]{6}$/.test(c.brandColor) ? c.brandColor : "#4f46e5";
  const totalBrl = extractProposalTotalBrl(proposal.content);
  const contactLine = [c?.email, c?.phone, c?.website].filter(Boolean).join("  ·  ");

  function handleSigned(res: SignatureResult) {
    setStatus("approved");
    setSignature({
      signerName: res.signerName,
      signerDocument: res.signerDocument,
      signatureImage: res.signatureImage,
      signedAt: res.signedAt,
      signerIp: res.signerIp,
    });
  }

  const cleanPhone = (c?.phone ?? "").replace(/\D/g, "");
  const whatsHref = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(
        `Olá! Acabei de aprovar e assinar digitalmente a proposta "${proposal.title}". Vamos alinhar os próximos passos!`
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
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">
                  Proposta Aprovada e Assinada Digitalmente
                </span>
                <span className="sm:hidden">Assinada</span>
              </span>
            ) : (
              <Button
                size="sm"
                onClick={() => setModalOpen(true)}
                style={{ backgroundColor: brandColor }}
                className="text-white hover:opacity-90"
              >
                <FileSignature className="size-4" />
                Aprovar Proposta
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
            <Markdown content={proposal.content} brandColor={brandColor} />
          </div>

          {/* Rodapé institucional */}
          <div className="flex flex-col items-center justify-between gap-2 border-t bg-slate-50/70 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:px-12">
            <span>{contactLine || c?.name || ""}</span>
            {proposal.watermark && (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Sparkles className="size-3" /> Gerado via Propoz • usepropoz.com.br
              </span>
            )}
          </div>
        </article>

        {/* Bloco inferior: Certificado de Assinatura Digital ou CTA de Aprovação */}
        <section
          id="aceite-proposta"
          className="mt-8 scroll-mt-24 overflow-hidden rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
        >
          {isApproved ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <CheckCircle2 className="size-6" />
                  </span>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                      Certificado de Aceite Digital
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Proposta Aprovada e Assinada Digitalmente
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/public/proposals/${proposal.id}/pdf`}>
                      <Download className="size-4" /> Baixar PDF com Certificado
                    </a>
                  </Button>
                  {whatsHref && (
                    <Button
                      size="sm"
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

              <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_220px] sm:items-center">
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border bg-slate-50/70 p-3">
                    <span className="block text-[10px] font-medium uppercase text-slate-400">
                      Signatário
                    </span>
                    <span className="mt-0.5 block font-semibold text-slate-900">
                      {signature.signerName || "Cliente"}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-slate-50/70 p-3">
                    <span className="block text-[10px] font-medium uppercase text-slate-400">
                      CPF / CNPJ
                    </span>
                    <span className="mt-0.5 block font-mono font-semibold text-slate-900">
                      {signature.signerDocument || "—"}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-slate-50/70 p-3">
                    <span className="block text-[10px] font-medium uppercase text-slate-400">
                      Data e hora do aceite
                    </span>
                    <span className="mt-0.5 block font-medium text-slate-800">
                      {signature.signedAt ? formatDate(signature.signedAt, true) : "Registrado"}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-slate-50/70 p-3">
                    <span className="block text-[10px] font-medium uppercase text-slate-400">
                      IP de auditoria
                    </span>
                    <span className="mt-0.5 block font-mono font-medium text-slate-800">
                      {signature.signerIp || "Verificado"}
                    </span>
                  </div>
                </div>

                {signature.signatureImage ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border bg-white p-3 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signature.signatureImage}
                      alt="Assinatura digital"
                      className="max-h-20 max-w-full object-contain"
                    />
                    <div className="mt-2 w-full border-t pt-1.5 text-[10px] text-slate-500">
                      Assinatura digital do cliente
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  <ShieldCheck className="size-4" /> Aceite e assinatura digital
                </span>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  De acordo com a proposta? Assine digitalmente
                </h3>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Clique no botão ao lado para informar seu Nome, CPF/CNPJ e assinar na tela. O
                  certificado de assinatura ficará gravado na proposta e no PDF.
                </p>
              </div>

              <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                {totalBrl > 0 && (
                  <span className="text-xs text-slate-500">
                    Investimento total:{" "}
                    <strong className="font-mono text-slate-900">{formatBrl(totalBrl)}</strong>
                  </span>
                )}
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setModalOpen(true)}
                  style={{ backgroundColor: brandColor }}
                  className="text-white shadow-sm hover:opacity-95"
                >
                  <FileSignature className="size-5" />
                  Aprovar Proposta
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      <SignatureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        proposalId={proposal.id}
        proposalTitle={proposal.title}
        defaultName={proposal.clientName}
        brandColor={brandColor}
        totalFormatted={totalBrl > 0 ? formatBrl(totalBrl) : null}
        onSuccess={handleSigned}
      />
    </div>
  );
}
