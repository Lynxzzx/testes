"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Clock, Gift, Loader2, Lock, Sparkles, Square, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyFields } from "@/components/company-fields";
import { Markdown } from "@/components/markdown";
import { BriefThermometer } from "@/components/proposal/brief-thermometer";
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

const DEMO_EXAMPLES = [
  {
    title: "Novo Site Institucional e Agendamento Online — Rede Sorriso",
    clientName: "Rede Sorriso Odontologia",
    brief: `Reunião realizada com o Dr. Paulo (sócio-diretor da Rede Sorriso, rede com 4 clínicas odontológicas em Curitiba/PR).
- Problema atual: o site antigo em WordPress é lento, não converte no celular e não ranqueia nas buscas locais do Google. Hoje dependem 100% de indicações e anúncios caros.
- Objetivo: criar um novo site institucional moderno e rápido, com páginas específicas por especialidade (Implantes, Ortodontia, Estética) e por unidade, integrado a agendamento online direto no WhatsApp da recepção de cada clínica.
- Escopo desejado: UX/UI Design responsivo, desenvolvimento em Next.js de alta performance, configuração de Google Meu Negócio + SEO local para as 4 unidades, rastreamento de conversões (GA4 + Meta Pixel) e treinamento da recepção.
- Prazo esperado: lançamento em até 6 semanas.
- Orçamento disponível: teto de R$ 18.000,00 (com possibilidade de manutenção mensal de R$ 600,00/mês).`,
  },
  {
    title: "Plataforma E-commerce B2B e Catálogo Digital — Serra Alta",
    clientName: "Torrefação Serra Alta Cafés Especiais",
    brief: `Cliente: Torrefação Serra Alta (fornecedora de cafés especiais para 280 cafeterias e empórios no Sudeste).
- Dor principal: 100% dos pedidos B2B chegam por WhatsApp e planilhas, tomando 3 horas por dia da equipe comercial e gerando erros de estoque.
- O que precisam: portal B2B fechado com login por CNPJ, tabela de preços diferenciada por faixa de volume (10 kg, 30 kg e +50 kg), botão "Repetir último pedido" em 1 clique e catálogo público institucional.
- Integrações obrigatórias: ERP Bling (sincronização de estoque e emissão de pedido/NF), cálculo de frete via Melhor Envio e pagamento via Pix (5% de desconto) ou boleto faturado (15/30 dias).
- Prazo: 8 semanas (antes da feira anual do setor).
- Orçamento: até R$ 26.000,00.`,
  },
];

const FAST_CLOSE_OPTIONS: {
  value: "24h" | "48h" | "3d" | "5d" | "7d";
  label: string;
  hours: number;
}[] = [
  { value: "24h", label: "24 horas", hours: 24 },
  { value: "48h", label: "48 horas", hours: 48 },
  { value: "3d", label: "3 dias", hours: 72 },
  { value: "5d", label: "5 dias", hours: 120 },
  { value: "7d", label: "7 dias", hours: 168 },
];

const BONUS_SUGGESTIONS = [
  "7% de desconto para pagamento à vista no Pix + Kickoff prioritário em 24h",
  "Configuração completa do Google Meu Negócio + GA4 sem custo adicional",
  "30 dias extras de suporte pós-lançamento e acompanhamento de métricas",
  "Sessão bônus de treinamento gravado para toda a equipe do cliente",
  "Isenção da taxa de setup + 5% de desconto na primeira parcela",
];

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
  const [suggestMarketPricing, setSuggestMarketPricing] = useState(true);
  const [fastCloseEnabled, setFastCloseEnabled] = useState(false);
  const [fastCloseWindow, setFastCloseWindow] = useState<"24h" | "48h" | "3d" | "5d" | "7d">("48h");
  const [fastCloseBonus, setFastCloseBonus] = useState("");
  const [bonusIdx, setBonusIdx] = useState(0);

  const selectedWindowObj =
    FAST_CLOSE_OPTIONS.find((o) => o.value === fastCloseWindow) ?? FAST_CLOSE_OPTIONS[1];
  const calculatedDeadline = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(Date.now() + selectedWindowObj.hours * 3600_000));

  function suggestBonus() {
    const lower = `${title} ${brief}`.toLowerCase();
    if (/site|landing|seo|google|clínica|clinica/i.test(lower) && bonusIdx === 0) {
      setFastCloseBonus(
        "Configuração gratuita do Google Meu Negócio + 5% de desconto para pagamento no Pix"
      );
    } else if (/e-commerce|ecommerce|loja|portal|sistema|app|erp|bling/i.test(lower) && bonusIdx === 0) {
      setFastCloseBonus(
        "30 dias extras de suporte prioritário pós-go-live + treinamento gravado da equipe"
      );
    } else {
      setFastCloseBonus(BONUS_SUGGESTIONS[bonusIdx % BONUS_SUGGESTIONS.length]);
    }
    setBonusIdx((i) => i + 1);
    toast.success("Sugestão de bônus aplicada!");
  }

  const [phase, setPhase] = useState<Phase>("form");
  const [exampleIdx, setExampleIdx] = useState(0);

  function fillWithExample() {
    const ex = DEMO_EXAMPLES[exampleIdx % DEMO_EXAMPLES.length];
    setTitle(ex.title);
    setClientName(ex.clientName);
    setBrief(ex.brief);
    setExampleIdx((i) => i + 1);
    toast.success("Campos preenchidos com um exemplo realista!");
  }
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
        body: JSON.stringify({
          title,
          clientName,
          brief,
          tone,
          sections:
            fastCloseEnabled && !sections.includes("termos")
              ? [...sections, "termos"]
              : sections,
          company,
          saveAsDefault,
          suggestMarketPricing,
          fastCloseEnabled,
          fastCloseWindow,
          fastCloseBonus,
        }),
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="brief">Brief do cliente *</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fillWithExample}
                  className="h-7 px-2 text-xs font-medium text-brand hover:bg-brand/10 hover:text-brand"
                >
                  <Wand2 className="size-3.5" />
                  Preencher com exemplo
                </Button>
                <span className={cn("text-xs text-muted-foreground", brief.length > 15000 && "text-destructive")}>
                  {brief.length.toLocaleString("pt-BR")} / 15.000
                </span>
              </div>
            </div>
            <Textarea
              id="brief"
              required
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={BRIEF_PLACEHOLDER}
              className="min-h-64 resize-y font-[450] leading-relaxed"
            />
            <BriefThermometer
              brief={brief}
              clientName={clientName}
              suggestMarketPricing={suggestMarketPricing}
            />
            <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/20 px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/40">
              <Checkbox
                checked={suggestMarketPricing}
                onCheckedChange={(v) => setSuggestMarketPricing(v === true)}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">
                  Sugerir faixa de preço de mercado (caso não tenha definido valor)
                </span>
                <p className="text-xs text-muted-foreground">
                  Quando nenhum orçamento é informado no briefing, a IA estima valores realistas de mercado em R$, distribui nas etapas e aplica ancoragem de retorno financeiro.
                </p>
              </div>
            </label>

            {/* Cláusula de Urgência / Bônus por Fechamento Rápido */}
            <div className="mt-2 rounded-lg border bg-muted/20 p-3.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <Checkbox
                  checked={fastCloseEnabled}
                  onCheckedChange={(v) => {
                    const enabled = v === true;
                    setFastCloseEnabled(enabled);
                    if (enabled && !sections.includes("termos")) {
                      setSections((prev) => [...prev, "termos"]);
                    }
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Gift className="size-3.5 text-brand" />
                    Adicionar condição especial / bônus por fechamento rápido
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Cria um box de destaque nas Condições Comerciais com prazo limite e incentivo exclusivo para acelerar o aceite.
                  </p>
                </div>
              </label>

              {fastCloseEnabled && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs">1. Prazo de validade da condição</Label>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                        <Clock className="size-3" />
                        Data limite calculada: {calculatedDeadline}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {FAST_CLOSE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFastCloseWindow(opt.value)}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                            fastCloseWindow === opt.value
                              ? "border-brand bg-brand text-white shadow-2xs"
                              : "bg-background text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor="fast-bonus" className="text-xs">
                        2. Condição ou bônus oferecido (opcional)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={suggestBonus}
                        className="h-6 px-2 text-xs font-medium text-brand hover:bg-brand/10 hover:text-brand"
                      >
                        <Sparkles className="size-3" />
                        Sugerir bônus com IA
                      </Button>
                    </div>
                    <Input
                      id="fast-bonus"
                      value={fastCloseBonus}
                      onChange={(e) => setFastCloseBonus(e.target.value)}
                      placeholder="Ex.: 5% de desconto no Pix ou Configuração gratuita do Google Meu Negócio (em branco = IA sugere)"
                      className="bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
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
