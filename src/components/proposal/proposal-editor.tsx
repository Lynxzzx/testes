"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Columns2,
  Copy,
  Download,
  Eye,
  Loader2,
  PencilLine,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, type ProposalStatus } from "@/components/dashboard/status-badge";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";

type ProposalData = {
  id: string;
  title: string;
  clientName: string;
  content: string;
  status: ProposalStatus;
  tone: string;
  aiModel: string;
  error: string;
  createdAt: string;
  updatedAt: string;
  company: {
    name?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
  };
  watermark: boolean;
};

type ViewMode = "preview" | "edit" | "split";

export function ProposalEditor({ initial }: { initial: ProposalData }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState<ProposalStatus>(initial.status);
  const [error, setError] = useState(initial.error);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);

  const [mode, setMode] = useState<ViewMode>("preview");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Se a proposta ainda estiver gerando em background, busca atualizações periodicamente
  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/proposals/${initial.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.content) setContent(data.content);
        if (data.status && data.status !== "generating") {
          setStatus(data.status);
          setError(data.error ?? "");
          setUpdatedAt(data.updatedAt);
          router.refresh();
        }
      } catch {
        /* ignora falhas momentâneas de rede */
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [status, initial.id, router]);

  async function saveChanges(nextStatus?: "draft" | "final", silent = false): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || initial.title,
          content,
          ...(nextStatus ? { status: nextStatus } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar alterações");
      if (nextStatus) setStatus(nextStatus);
      setDirty(false);
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
      if (!silent) toast.success("Alterações salvas!");
      router.refresh();
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      if (dirty) {
        const ok = await saveChanges(undefined, true);
        if (!ok) return;
      }
      const res = await fetch(`/api/proposals/${initial.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha ao gerar o PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "proposta.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Texto copiado para a área de transferência.");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`Excluir a proposta "${title}"? Essa ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/proposals/${initial.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Não foi possível excluir.");
    toast.success("Proposta excluída.");
    router.push("/dashboard");
    router.refresh();
  }

  const c = initial.company;
  const contactLine = [c?.email, c?.phone, c?.website].filter(Boolean).join("  ·  ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      {/* Barra superior */}
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Propostas
            </Link>
            <span>/</span>
            <StatusBadge status={status} />
            <span>· Atualizada em {formatDate(updatedAt, true)}</span>
            {dirty && <span className="font-medium text-amber-600">· Alterações não salvas</span>}
          </div>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            disabled={status === "generating"}
            className="h-auto border-transparent bg-transparent px-0 text-xl font-semibold tracking-tight shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2.5 sm:text-2xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!content || status === "generating"}
          >
            {copied ? <Check /> : <Copy />}
            Copiar
          </Button>

          {(status === "draft" || status === "final") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveChanges(status === "final" ? "draft" : "final")}
              disabled={saving}
            >
              <CheckCircle2 className={cn(status === "final" && "text-emerald-600")} />
              {status === "final" ? "Marcar como rascunho" : "Marcar como finalizada"}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => saveChanges()}
            disabled={!dirty || saving || status === "generating"}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar
          </Button>

          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!content || downloading || status === "generating"}
          >
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            Baixar PDF
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            title="Excluir proposta"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/propostas/nova">Gerar novamente</Link>
          </Button>
        </div>
      )}

      {/* Alternador Visualizar / Editar / Lado a lado */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              mode === "preview" && "bg-accent text-foreground"
            )}
          >
            <Eye className="size-3.5" /> Visualizar
          </button>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              mode === "edit" && "bg-accent text-foreground"
            )}
          >
            <PencilLine className="size-3.5" /> Editar Markdown
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={cn(
              "hidden items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex",
              mode === "split" && "bg-accent text-foreground"
            )}
          >
            <Columns2 className="size-3.5" /> Lado a lado
          </button>
        </div>

        {initial.watermark && (
          <Link href="/dashboard/plano" className="text-xs text-muted-foreground hover:text-brand">
            PDF com marca d&apos;água · <span className="font-medium text-brand">Remover no Pro →</span>
          </Link>
        )}
      </div>

      {/* Área principal */}
      <div className={cn("mt-4 grid gap-6", mode === "split" && "lg:grid-cols-2")}>
        {(mode === "edit" || mode === "split") && (
          <div className="flex flex-col rounded-xl border bg-background shadow-xs">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <span>Editor Markdown</span>
              <span>{content.length.toLocaleString("pt-BR")} caracteres</span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              disabled={status === "generating"}
              placeholder="Escreva ou edite o conteúdo da proposta em Markdown..."
              className="min-h-[720px] flex-1 resize-y rounded-none border-0 p-5 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </div>
        )}

        {(mode === "preview" || mode === "split") && (
          <div className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
            {/* Simulação de folha A4 do PDF */}
            <div className="flex items-center justify-between gap-4 border-b px-6 py-5 sm:px-12">
              <div className="flex items-center gap-3">
                {c?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo} alt="" className="max-h-9 max-w-[120px] object-contain" />
                ) : null}
                <span className="text-sm font-semibold text-slate-900">
                  {c?.name || "Proposta Comercial"}
                </span>
              </div>
              <div className="text-right text-xs text-slate-500">
                {c?.cnpj && <p>CNPJ {c.cnpj}</p>}
                {c?.address && <p>{c.address}</p>}
              </div>
            </div>

            <div className="px-6 py-8 sm:px-12 sm:py-10">
              <div className="mb-4 h-1 w-11 rounded-full bg-brand" />
              {content ? (
                <Markdown content={content} streaming={status === "generating"} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {status === "generating" ? "Gerando proposta…" : "Nenhum conteúdo disponível."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t bg-slate-50/60 px-6 py-4 text-xs text-slate-500 sm:px-12">
              <span>
                {contactLine || c?.name || ""}
                {initial.watermark ? " · Gerado com PropostaAI" : ""}
              </span>
              <span>PDF A4</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
