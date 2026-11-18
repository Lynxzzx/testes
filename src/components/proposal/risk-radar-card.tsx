"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Lightbulb,
  Lock,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { RiskRadarItem } from "@/lib/ai/prompts";
import { cn } from "@/lib/utils";

/**
 * Fallback inteligente para propostas antigas (criadas antes do campo `riskRadar`)
 * ou caso algum modelo omita o bloco JSON, garantindo que o autor sempre tenha
 * alertas e oportunidades úteis baseados no briefing.
 */
export function buildFallbackRiskRadar(brief: string): RiskRadarItem[] {
  const items: RiskRadarItem[] = [];
  const lower = (brief || "").toLowerCase();

  if (!/texto|foto|imagem|conteúdo|conteudo|material|identidade visual|logo/i.test(lower)) {
    items.push({
      type: "warning",
      title: "Fornecimento de materiais e acessos não especificado",
      description:
        "O briefing não deixa claro quem fornecerá textos, imagens, logotipos e credenciais de acesso nem o prazo para entrega desses insumos.",
      clause:
        "**Fornecimento de insumos e acessos**: Os prazos do cronograma contam a partir do envio de todos os materiais (textos, imagens, identidade visual e credenciais de acesso) pelo CONTRATANTE.",
    });
  }

  if (!/revisão|revisao|rodada|alteração|alteracao|ajuste/i.test(lower)) {
    items.push({
      type: "warning",
      title: "Limite de rodadas de revisão em aberto",
      description:
        "Sem um limite claro de revisões por etapa, o projeto corre risco de retrabalho contínuo (scope creep) sem remuneração adicional.",
      clause:
        "**Ciclos de revisão**: Cada etapa contempla até 2 (duas) rodadas de ajustes dentro do escopo aprovado; solicitações extras ou mudanças de direção serão orçadas à parte.",
    });
  }

  if (!/hospedagem|servidor|licença|licenca|api|domínio|dominio|mensalidade de terceiros/i.test(lower)) {
    items.push({
      type: "warning",
      title: "Custos de terceiros e infraestrutura",
      description:
        "Deixe explícito que taxas de hospedagem, domínio, licenças de software, APIs pagas ou verba de mídia são de responsabilidade direta do cliente.",
      clause:
        "**Custos de terceiros**: Taxas de domínio, servidores/hospedagem, licenças de plugins/APIs e verbas de mídia paga são custeadas diretamente pelo CONTRATANTE.",
    });
  }

  items.push({
    type: "opportunity",
    title: "Oportunidade de recorrência mensal pós-entrega",
    description:
      "Após o go-live e o período inicial de garantia, ofereça um plano contínuo de evolução, monitoramento e suporte mensal para gerar receita recorrente.",
    clause:
      "**Plano opcional de evolução contínua**: Após o período inicial de suporte, o CONTRATANTE poderá optar pelo plano mensal de manutenção preventiva, monitoramento e melhorias evolutivas.",
  });

  return items.slice(0, 4);
}

/**
 * Insere uma cláusula dentro da seção `## Condições comerciais` (ou cria a seção ao final).
 */
export function appendClauseToMarkdown(markdown: string, clause: string): string {
  const bullet = clause.trim().startsWith("-") ? clause.trim() : `- ${clause.trim()}`;
  const lines = markdown.split("\n");

  // Procura seção "## Condições comerciais" ou similar
  const sectionIdx = lines.findIndex((l) =>
    /^##\s+.*(condições comerciais|condicoes comerciais|termos|observações|observacoes)/i.test(
      l.trim()
    )
  );

  if (sectionIdx !== -1) {
    // Encontra o próximo H2 (se houver) para inserir antes dele
    let insertAt = lines.length;
    for (let i = sectionIdx + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i].trim())) {
        insertAt = i;
        break;
      }
    }
    // Volta linhas em branco antes do próximo H2
    while (insertAt > sectionIdx + 1 && !lines[insertAt - 1].trim()) {
      insertAt--;
    }
    const before = lines.slice(0, insertAt);
    const after = lines.slice(insertAt);
    return [...before, bullet, ...after].join("\n");
  }

  return `${markdown.trim()}\n\n## Condições comerciais\n${bullet}\n`;
}

export function RiskRadarCard({
  items,
  brief,
  content,
  onInsertClause,
  disabled,
}: {
  items?: RiskRadarItem[];
  brief?: string;
  content: string;
  onInsertClause: (nextMarkdown: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [addedIndices, setAddedIndices] = useState<number[]>([]);

  const radarItems =
    items && items.length > 0 ? items : buildFallbackRiskRadar(brief || content);

  if (radarItems.length === 0) return null;

  const warningCount = radarItems.filter((i) => i.type === "warning").length;
  const opportunityCount = radarItems.filter((i) => i.type === "opportunity").length;

  function handleAddClause(item: RiskRadarItem, idx: number) {
    const clauseText =
      item.clause?.trim() || `**${item.title}**: ${item.description}`;
    if (content.includes(clauseText)) {
      toast.info("Esta cláusula já está presente na proposta.");
      return;
    }
    const updated = appendClauseToMarkdown(content, clauseText);
    onInsertClause(updated);
    setAddedIndices((prev) => [...prev, idx]);
    toast.success("Cláusula adicionada na seção Condições Comerciais!");
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.04] via-background to-brand/[0.04] shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
            <ShieldAlert className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">
                Radar de Riscos & Oportunidades
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Lock className="size-2.5" /> Visível apenas para você (nunca sai no PDF ou link)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {warningCount > 0 && `${warningCount} ponto(s) de atenção`}
              {warningCount > 0 && opportunityCount > 0 && " · "}
              {opportunityCount > 0 && `${opportunityCount} oportunidade(s) comercial(is)`}
            </p>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="grid gap-3 border-t bg-background/60 p-4 sm:grid-cols-2 sm:p-5">
          {radarItems.map((item, idx) => {
            const isWarning = item.type === "warning";
            const alreadyAdded =
              addedIndices.includes(idx) ||
              Boolean(item.clause && content.includes(item.clause.trim()));

            return (
              <div
                key={`${idx}-${item.title}`}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-4 transition-all",
                  isWarning
                    ? "border-amber-500/25 bg-amber-500/[0.03]"
                    : "border-brand/25 bg-brand/[0.03]"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        isWarning
                          ? "bg-amber-500/15 text-amber-800"
                          : "bg-brand/15 text-brand"
                      )}
                    >
                      {isWarning ? (
                        <>
                          <AlertTriangle className="size-3" /> Alerta de Risco
                        </>
                      ) : (
                        <>
                          <Lightbulb className="size-3" /> Oportunidade Comercial
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3.5 border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || alreadyAdded}
                    onClick={() => handleAddClause(item, idx)}
                    className="h-7 w-full text-xs"
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        Cláusula incluída na proposta
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        {isWarning
                          ? "Adicionar cláusula de proteção na proposta"
                          : "Inserir sugestão nas Condições Comerciais"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
