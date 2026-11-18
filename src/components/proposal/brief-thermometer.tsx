"use client";

import { CheckCircle2, Circle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function BriefThermometer({
  brief,
  clientName,
  suggestMarketPricing,
}: {
  brief: string;
  clientName?: string;
  suggestMarketPricing?: boolean;
}) {
  const text = brief.trim();
  const len = text.length;

  const hasLength = len >= 140;
  const hasGoalOrPain =
    /\b(objetivo|meta|dor|problema|desafio|precisa|quer|aumentar|reduzir|melhorar|automatizar|vender|converter|criar|desenvolver|implantar|reformular|site|sistema|app|plataforma|consultoria)\b/i.test(
      text
    );
  const hasTimeline =
    /\b(\d+\s*(dia|dias|semana|semanas|mês|mes|meses|ano|anos)|prazo|urgente|entrega|lançamento|lancamento|cronograma)\b/i.test(
      text
    );
  const hasBudget =
    Boolean(suggestMarketPricing) ||
    /\b(r\$|\d+\s*mil|orçamento|orcamento|verba|investimento|teto|valor|preço|preco|mensalidade)\b/i.test(
      text
    );
  const hasDecisionMaker =
    Boolean(clientName && clientName.trim().length >= 2) ||
    /\b(sócio|socio|diretor|gerente|ceo|fundador|decisor|dr\.|dra\.|equipe|unidades|clínica|clinica|loja|empresa)\b/i.test(
      text
    );

  const checks = [
    { key: "goal", label: "Objetivo / dor", ok: hasGoalOrPain },
    { key: "length", label: "Contexto detalhado", ok: hasLength },
    { key: "timeline", label: "Prazo", ok: hasTimeline },
    {
      key: "budget",
      label: suggestMarketPricing ? "Preço IA ativo" : "Orçamento",
      ok: hasBudget,
    },
    { key: "client", label: "Cliente / decisor", ok: hasDecisionMaker },
  ];

  const score = checks.filter((c) => c.ok).length;

  if (len === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground">
        Comece a digitar o briefing ou clique em <strong>Preencher com exemplo</strong> para ver a qualidade do contexto em tempo real.
      </div>
    );
  }

  let level: "weak" | "good" | "killer" = "weak";
  let label = "Fraco";
  let tip = "Adicione o objetivo do cliente e as principais dores a resolver.";
  let barColor = "bg-amber-500";
  let badgeClass = "bg-amber-500/10 text-amber-700 border-amber-500/20";
  let pct = Math.max(20, score * 20);

  if (score >= 4 && len >= 140) {
    level = "killer";
    label = "Matador";
    tip = "Briefing completo para uma proposta de alta conversão!";
    barColor = "bg-emerald-500";
    badgeClass = "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    pct = 100;
  } else if (score >= 2 && len >= 60) {
    level = "good";
    label = "Bom";
    const missing = !hasTimeline && !hasBudget
      ? "Incluir prazo ou orçamento deixa ainda melhor."
      : !hasTimeline
        ? "Incluir o prazo estimado deixa ainda melhor."
        : !hasBudget
          ? "Incluir orçamento (ou ativar a sugestão de preço abaixo) deixa ainda melhor."
          : "Adicione um pouco mais de contexto sobre o escopo.";
    tip = `Boa base! ${missing}`;
    barColor = "bg-brand";
    badgeClass = "bg-brand/10 text-brand border-brand/20";
    pct = Math.max(55, score * 20);
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
              badgeClass
            )}
          >
            {level === "killer" && <Flame className="size-3" />}
            Termômetro: {label}
          </span>
          <span className="text-muted-foreground">{tip}</span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist de elementos detectados */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {checks.map((c) => (
          <span
            key={c.key}
            className={cn(
              "inline-flex items-center gap-1 transition-colors",
              c.ok ? "font-medium text-foreground" : "text-muted-foreground/70"
            )}
          >
            {c.ok ? (
              <CheckCircle2 className="size-3 text-emerald-600" />
            ) : (
              <Circle className="size-3 opacity-50" />
            )}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
