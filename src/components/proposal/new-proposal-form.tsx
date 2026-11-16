"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Loader2, Lock, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { CompanyFields } from "@/components/company-fields";
import { Markdown } from "@/components/markdown";
import { TonePicker } from "@/components/tone-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyValues } from "@/lib/company";
import { DEFAULT_SECTIONS, SECTIONS, type SectionKey, type Tone } from "@/lib/plans";
import { cn } from "@/lib/utils";

const BRIEF_PLACEHOLDER = `Ex.: Reunião com a Rede Sorriso (4 clínicas odontológicas em Curitiba).
- Querem um site novo, o atual é lento e não aparece no Google
- Agendamento online integrado ao WhatsApp
- SEO local para as 4 unidades
- Orçamento até R$ 18 mil, lançamento em 2 meses
- Decisor: Dr. Paulo (sócio), quer ver cases da área da saúde`;

type Phase = "form" | "streaming";

export function NewProposalForm({
  defaultCompany,
  defaultTone,
  usage,
}: {
  defaultCompany: CompanyValues;
  defaultTone: Tone;
  usage: { plan: "free" | "pro"; remaining: number | null; canGenerate: boolean };
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [sections, setSections] = useState<SectionKey[]>(DEFAULT_SECTIONS);
  const [company, setCompany] = useState<CompanyValues>(defaultCompany);
  const [editCompany, setEditCompany] = useState(!defaultCompany.name);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const [phase, setPhase] = useState<Phase>("form");
  const [output, setOutput] = useState("");
  const [model, setModel] = useState("");
  const [limitReached, setLimitReached] = useState(!usage.canGenerate);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "streaming") bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [output, phase]);

  const toggleSection = (key: SectionKey) =>
    setSections((prev) =>
      prev.includes(key)
        ? prev.filter((s) => s !== key)
        : (Object.keys(SECTIONS) as SectionKey[]).filter((k) => k === key || prev.includes(k))
    );

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (brief.trim().length < 40) return toast.error("O brief precisa ter ao menos 40 caracteres.");
    if (!sections.length) return toast.error("Selecione ao menos uma seção.");

    setPhase("streaming");
    setOutput("");
    setModel("");
    const controller = new AbortController();
    abortRef.current = controller;

    let proposalId: string | null = null;
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, clientName, brief, tone, sections, company, saveAsDefault }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "limit_reached") setLimitReached(true);
        throw new Error(data.error ?? "Não foi possível gerar a proposta.");
      }

      proposalId = res.headers.get("X-Proposal-Id");
      setModel(res.headers.get("X-AI-Model") ?? "");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setOutput(text);
      }

      const errIdx = text.indexOf("[[ERRO]]");
      if (errIdx !== -1) {
        const msg = text.slice(errIdx + 8).trim();
        if (errIdx < 300) throw new Error(msg || "Falha durante a geração.");
        toast.warning("A geração foi interrompida, mas salvamos o conteúdo parcial para você editar.");
      } else {
        toast.success("Proposta gerada! Revise e baixe o PDF.");
      }
      router.push(`/dashboard/propostas/${proposalId}`);
      router.refresh();
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast.info("Visualização interrompida. A proposta continuará sendo gerada e aparecerá no seu painel.");
        router.push(proposalId ? `/dashboard/propostas/${proposalId}` : "/dashboard");
        return;
      }
      toast.error((err as Error).message);
      setPhase("form");
    }
  }

  if (phase === "streaming") {
    return (
      <div className="mt-8 overflow-hidden rounded-xl border bg-background shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
            <span className="font-medium">{output ? "Escrevendo sua proposta…" : "Analisando o brief…"}</span>
            {model && <span className="hidden truncate text-xs text-muted-foreground sm:inline">· {model}</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
            <Square className="size-3" /> Parar visualização
          </Button>
        </div>
        <div className="max-h-[70vh] min-h-[320px] overflow-y-auto px-6 py-8 sm:px-10">
          {output ? (
            <Markdown content={output.replace(/\[\[ERRO\]\][\s\S]*$/, "")} streaming />
          ) : (
            <div className="space-y-3">
              {[80, 60, 95, 70, 85, 50].map((w, i) => (
                <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
              ))}
              <p className="pt-4 text-xs text-muted-foreground">
                Modelos gratuitos podem levar alguns segundos para começar. Se um estiver ocupado, trocamos
                automaticamente para outro.
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={generate} className="mt-8 space-y-6">
      {limitReached && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm">
            <Lock className="size-4 text-amber-600" />
            Você usou as 3 propostas gratuitas deste mês.
          </p>
          <Button asChild size="sm" variant="brand">
            <Link href="/dashboard/plano">Fazer upgrade — R$ 39/mês</Link>
          </Button>
        </div>
      )}

      {/* 1. Projeto */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 className="font-semibold">Projeto</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Nome da proposta *</Label>
            <Input
              id="title"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Novo site institucional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex.: Rede Sorriso"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-end justify-between">
              <Label htmlFor="brief">Brief do cliente *</Label>
              <span className={cn("text-xs text-muted-foreground", brief.length > 15000 && "text-destructive")}>
                {brief.length.toLocaleString("pt-BR")} / 15.000
              </span>
            </div>
            <Textarea
              id="brief"
              required
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={BRIEF_PLACEHOLDER}
              className="min-h-64 resize-y font-[450] leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais contexto (objetivos, dores, orçamento, prazos, decisores), melhor a proposta.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Empresa */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
              <Building2 className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold">Sua empresa</h2>
              <p className="truncate text-sm text-muted-foreground">
                {company.name ? `${company.name}${company.cnpj ? ` · ${company.cnpj}` : ""}` : "Preencha os dados da sua empresa"}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditCompany((v) => !v)}>
            {editCompany ? "Recolher" : "Editar"}
            <ChevronDown className={cn("transition-transform", editCompany && "rotate-180")} />
          </Button>
        </div>
        {editCompany && (
          <div className="mt-6 space-y-5 border-t pt-6">
            <CompanyFields value={company} onChange={setCompany} compact />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={saveAsDefault} onCheckedChange={(v) => setSaveAsDefault(v === true)} />
              Salvar estes dados como padrão
            </label>
          </div>
        )}
      </section>

      {/* 3. Estilo e seções */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 className="font-semibold">Tom da proposta</h2>
        <div className="mt-4">
          <TonePicker value={tone} onChange={setTone} />
        </div>

        <h2 className="mt-8 font-semibold">Seções</h2>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o que deve aparecer na proposta.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(Object.keys(SECTIONS) as SectionKey[]).map((key) => (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-accent/50",
                sections.includes(key) && "border-foreground/20 bg-accent/40"
              )}
            >
              <Checkbox checked={sections.includes(key)} onCheckedChange={() => toggleSection(key)} />
              {SECTIONS[key]}
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse items-stretch gap-3 border-t bg-background/90 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          {usage.plan === "pro"
            ? "Plano Pro · propostas ilimitadas"
            : `${usage.remaining ?? 0} proposta(s) restante(s) este mês`}
        </p>
        <Button type="submit" size="lg" variant="brand" disabled={limitReached}>
          <Sparkles /> Gerar proposta
        </Button>
      </div>
    </form>
  );
}
