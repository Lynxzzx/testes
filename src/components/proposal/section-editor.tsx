"use client";

import { useState } from "react";
import { Check, Cpu, Flame, Loader2, PencilLine, Plus, Minimize2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatBrl, parseBrlAmount } from "@/lib/proposal-charts";

type ParsedSection = {
  heading: string; // Ex: "Resumo executivo" (ou "" para o cabeçalho H1 inicial)
  body: string;
};

type InvestmentRow = {
  item: string;
  description: string;
  amount: number;
};

/**
 * Divide o Markdown da proposta em blocos por seção `## `.
 */
export function splitMarkdownSections(md: string): ParsedSection[] {
  const lines = (md || "").split("\n");
  const sections: ParsedSection[] = [];
  let currentHeading = "";
  let buffer: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentHeading || buffer.join("\n").trim()) {
        sections.push({ heading: currentHeading, body: buffer.join("\n").trim() });
      }
      currentHeading = h2Match[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (currentHeading || buffer.join("\n").trim()) {
    sections.push({ heading: currentHeading, body: buffer.join("\n").trim() });
  }

  return sections;
}

export function joinMarkdownSections(sections: ParsedSection[]): string {
  return sections
    .map((s) => (s.heading ? `## ${s.heading}\n${s.body}` : s.body))
    .filter(Boolean)
    .join("\n\n");
}

function stripCell(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
}

/**
 * Detecta se o corpo de uma seção possui uma tabela de Investimento (com valores em R$)
 * e extrai as linhas editáveis + texto antes/depois da tabela.
 */
function parseInvestmentTableFromSection(body: string): {
  beforeTable: string;
  afterTable: string;
  rows: InvestmentRow[];
} | null {
  const lines = body.split("\n");
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
      if (tableStart === -1) tableStart = i;
      tableEnd = i;
    } else if (tableStart !== -1) {
      break;
    }
  }

  if (tableStart === -1 || tableEnd - tableStart < 2) return null;

  const tableLines = lines.slice(tableStart, tableEnd + 1);
  // Verifica se tem valores em R$
  if (!tableLines.some((l) => /R\$\s*\d/i.test(l))) return null;

  const dataLines = tableLines.slice(2); // pula cabeçalho e linha separadora |---|
  const rows: InvestmentRow[] = [];

  for (const line of dataLines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    const first = stripCell(cells[0]);
    if (/^(total|subtotal|soma|investimento total)\b/i.test(first)) continue;

    const amountCell = cells[cells.length - 1];
    const amt = parseBrlAmount(amountCell) ?? 0;
    const description = cells.length >= 3 ? stripCell(cells[1]) : "";
    rows.push({ item: first, description, amount: amt });
  }

  if (rows.length === 0) return null;

  return {
    beforeTable: lines.slice(0, tableStart).join("\n").trim(),
    afterTable: lines.slice(tableEnd + 1).join("\n").trim(),
    rows,
  };
}

function buildInvestmentSectionBody(
  beforeTable: string,
  rows: InvestmentRow[],
  afterTable: string
): string {
  const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const tableLines = [
    "| Etapa / Entregável | Descrição | Valor |",
    "|--------------------|-----------|-------|",
    ...rows.map(
      (r) =>
        `| ${r.item || "Item"} | ${r.description || "—"} | ${formatBrl(
          Number.isFinite(r.amount) ? r.amount : 0
        )} |`
    ),
    `| **Total** |  | **${formatBrl(total)}** |`,
  ];

  return [beforeTable, tableLines.join("\n"), afterTable].filter(Boolean).join("\n\n");
}

export function SectionEditor({
  proposalId,
  content,
  onChange,
  disabled,
  brandColor = "#4f46e5",
}: {
  proposalId: string;
  content: string;
  onChange: (nextMarkdown: string) => void;
  disabled?: boolean;
  brandColor?: string;
}) {
  const sections = splitMarkdownSections(content);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [refiningIdx, setRefiningIdx] = useState<number | null>(null);

  function updateSection(idx: number, patch: Partial<ParsedSection>) {
    const next = sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(joinMarkdownSections(next));
  }

  async function refineSectionWithAi(
    idx: number,
    action: "persuasive" | "shorten" | "technical"
  ) {
    const target = sections[idx];
    if (!target || !target.body.trim()) return;

    setRefiningIdx(idx);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/refine-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading: target.heading,
          body: target.body,
          action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.content) {
        throw new Error(data.error ?? "Não foi possível refinar esta seção.");
      }
      updateSection(idx, { body: data.content });
      toast.success(`Seção "${target.heading || "Introdução"}" refinada com IA!`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRefiningIdx(null);
    }
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const isEditing = editingIdx === idx;
        const isIntro = !section.heading && idx === 0;
        const investmentTable =
          /investimento|orçamento|orcamento|valores|preço/i.test(section.heading)
            ? parseInvestmentTableFromSection(section.body)
            : null;

        return (
          <div
            key={`${idx}-${section.heading || "intro"}`}
            className="overflow-hidden rounded-xl border bg-background shadow-xs transition-all"
          >
            {/* Cabeçalho do card da seção */}
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: brandColor }}
                />
                {isEditing && !isIntro ? (
                  <Input
                    value={section.heading}
                    onChange={(e) => updateSection(idx, { heading: e.target.value })}
                    className="h-7 max-w-xs text-sm font-semibold"
                  />
                ) : (
                  <h3 className="truncate text-sm font-semibold">
                    {section.heading || "Cabeçalho e título da proposta"}
                  </h3>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isIntro && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-brand hover:text-brand"
                        disabled={disabled || refiningIdx !== null}
                      >
                        {refiningIdx === idx ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Refinando…
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" /> Refinar com IA
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onSelect={() => refineSectionWithAi(idx, "persuasive")}>
                        <Flame className="size-4 text-amber-500" />
                        Deixar mais persuasivo
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => refineSectionWithAi(idx, "shorten")}>
                        <Minimize2 className="size-4 text-sky-500" />
                        Encurtar texto
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => refineSectionWithAi(idx, "technical")}>
                        <Cpu className="size-4 text-violet-500" />
                        Tornar mais técnico
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  type="button"
                  variant={isEditing ? "brand" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  disabled={disabled || refiningIdx === idx}
                  onClick={() => setEditingIdx(isEditing ? null : idx)}
                >
                  {isEditing ? (
                    <>
                      <Check className="size-3.5" /> Concluir edição
                    </>
                  ) : (
                    <>
                      <PencilLine className="size-3.5" /> Editar texto
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Editor interativo dedicado para a tabela de Investimento */}
              {investmentTable && !isEditing ? (
                <div className="space-y-5">
                  {investmentTable.beforeTable && (
                    <Markdown content={investmentTable.beforeTable} />
                  )}

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Itens da tabela de investimento (clique nos campos para editar)
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={disabled}
                        onClick={() => {
                          const nextRows = [
                            ...investmentTable.rows,
                            { item: "Nova etapa", description: "Descrição da entrega", amount: 1000 },
                          ];
                          updateSection(idx, {
                            body: buildInvestmentSectionBody(
                              investmentTable.beforeTable,
                              nextRows,
                              investmentTable.afterTable
                            ),
                          });
                        }}
                      >
                        <Plus className="size-3.5" /> Adicionar item
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="hidden grid-cols-[1.2fr_1.5fr_140px_36px] gap-2 px-1 text-[11px] font-medium text-muted-foreground sm:grid">
                        <span>Etapa / Entregável</span>
                        <span>Descrição</span>
                        <span>Valor (R$)</span>
                        <span />
                      </div>

                      {investmentTable.rows.map((row, rIdx) => (
                        <div
                          key={rIdx}
                          className="grid grid-cols-1 gap-2 rounded-lg border bg-background p-2 sm:grid-cols-[1.2fr_1.5fr_140px_36px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
                        >
                          <Input
                            value={row.item}
                            disabled={disabled}
                            placeholder="Etapa / Entregável"
                            onChange={(e) => {
                              const nextRows = investmentTable.rows.map((r, i) =>
                                i === rIdx ? { ...r, item: e.target.value } : r
                              );
                              updateSection(idx, {
                                body: buildInvestmentSectionBody(
                                  investmentTable.beforeTable,
                                  nextRows,
                                  investmentTable.afterTable
                                ),
                              });
                            }}
                          />
                          <Input
                            value={row.description}
                            disabled={disabled}
                            placeholder="Descrição"
                            onChange={(e) => {
                              const nextRows = investmentTable.rows.map((r, i) =>
                                i === rIdx ? { ...r, description: e.target.value } : r
                              );
                              updateSection(idx, {
                                body: buildInvestmentSectionBody(
                                  investmentTable.beforeTable,
                                  nextRows,
                                  investmentTable.afterTable
                                ),
                              });
                            }}
                          />
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              R$
                            </span>
                            <Input
                              type="number"
                              step="50"
                              min="0"
                              value={row.amount}
                              disabled={disabled}
                              className="pl-8 font-mono"
                              onChange={(e) => {
                                const val = Number.parseFloat(e.target.value) || 0;
                                const nextRows = investmentTable.rows.map((r, i) =>
                                  i === rIdx ? { ...r, amount: val } : r
                                );
                                updateSection(idx, {
                                  body: buildInvestmentSectionBody(
                                    investmentTable.beforeTable,
                                    nextRows,
                                    investmentTable.afterTable
                                  ),
                                });
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={disabled || investmentTable.rows.length <= 1}
                            onClick={() => {
                              const nextRows = investmentTable.rows.filter((_, i) => i !== rIdx);
                              updateSection(idx, {
                                body: buildInvestmentSectionBody(
                                  investmentTable.beforeTable,
                                  nextRows,
                                  investmentTable.afterTable
                                ),
                              });
                            }}
                            title="Remover item"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                      <span className="font-medium text-muted-foreground">
                        Investimento Total Calculado:
                      </span>
                      <span className="font-mono text-base font-semibold" style={{ color: brandColor }}>
                        {formatBrl(
                          investmentTable.rows.reduce((sum, r) => sum + (r.amount || 0), 0)
                        )}
                      </span>
                    </div>
                  </div>

                  {investmentTable.afterTable && (
                    <Markdown content={investmentTable.afterTable} />
                  )}
                </div>
              ) : isEditing ? (
                <Textarea
                  value={section.body}
                  onChange={(e) => updateSection(idx, { body: e.target.value })}
                  rows={Math.max(5, Math.min(18, section.body.split("\n").length + 2))}
                  className="font-mono text-sm leading-relaxed"
                />
              ) : (
                <div
                  onClick={() => !disabled && setEditingIdx(idx)}
                  className="cursor-pointer rounded-lg transition-colors hover:bg-muted/20"
                  title="Clique para editar esta seção"
                >
                  <Markdown content={section.body} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
