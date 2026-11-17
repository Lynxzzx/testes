"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BarChart3, CalendarRange } from "lucide-react";
import { sanitizeProposalMarkdown } from "@/lib/ai/prompts";
import {
  extractInvestmentChart,
  extractTimelineChart,
  formatBrl,
} from "@/lib/proposal-charts";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#4f46e5", // indigo-600
  "#7c3aed", // violet-600
  "#0284c7", // sky-600
  "#0d9488", // teal-600
  "#d97706", // amber-600
  "#e11d48", // rose-600
  "#475569", // slate-600
];

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
};

function getNodeText(node?: HastNode): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  if (!node.children) return "";
  return node.children.map(getNodeText).join("");
}

function parseHastTable(tableNode?: HastNode): { headers: string[]; rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];
  if (!tableNode?.children) return { headers, rows };

  for (const section of tableNode.children) {
    if (section.tagName === "thead" && section.children) {
      for (const tr of section.children) {
        if (tr.tagName === "tr" && tr.children) {
          for (const th of tr.children) {
            if (th.tagName === "th" || th.tagName === "td") {
              headers.push(getNodeText(th).trim());
            }
          }
        }
      }
    } else if (section.tagName === "tbody" && section.children) {
      for (const tr of section.children) {
        if (tr.tagName === "tr" && tr.children) {
          const row: string[] = [];
          for (const td of tr.children) {
            if (td.tagName === "td" || td.tagName === "th") {
              row.push(getNodeText(td).trim());
            }
          }
          if (row.length) rows.push(row);
        }
      }
    }
  }
  return { headers, rows };
}

export function Markdown({
  content,
  className,
  streaming,
}: {
  content: string;
  className?: string;
  streaming?: boolean;
}) {
  const cleaned = sanitizeProposalMarkdown(content);

  return (
    <div className={cn("proposal-prose", streaming && "is-streaming", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table({ node, children, ...props }) {
            const { headers, rows } = parseHastTable(node as unknown as HastNode);
            const investment = !streaming ? extractInvestmentChart(headers, rows) : null;
            const timeline = !streaming && !investment ? extractTimelineChart(headers, rows) : null;

            return (
              <div className="my-6 space-y-4">
                <table {...props}>{children}</table>

                {investment && (
                  <div className="not-prose rounded-xl border bg-slate-50/80 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                        <BarChart3 className="size-4 text-brand" />
                        Gráfico de distribuição do investimento
                      </p>
                      <span className="text-xs font-semibold text-slate-900">
                        Total: {formatBrl(investment.total)}
                      </span>
                    </div>

                    {/* Barra segmentada 100% */}
                    <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      {investment.items.map((item, idx) => (
                        <div
                          key={item.label}
                          style={{
                            width: `${Math.max(item.percentage, 3)}%`,
                            backgroundColor: PALETTE[idx % PALETTE.length],
                          }}
                          title={`${item.label}: ${item.formatted} (${item.percentage}%)`}
                        />
                      ))}
                    </div>

                    {/* Barras individuais por etapa */}
                    <div className="mt-4 space-y-2.5">
                      {investment.items.map((item, idx) => {
                        const color = PALETTE[idx % PALETTE.length];
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700">
                                <span
                                  className="size-2.5 shrink-0 rounded-sm"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate">{item.label}</span>
                              </span>
                              <span className="shrink-0 font-mono text-slate-600">
                                {item.formatted}{" "}
                                <strong className="text-slate-900">({item.percentage}%)</strong>
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.max(item.percentage, 2)}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {timeline && (
                  <div className="not-prose rounded-xl border bg-slate-50/80 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                        <CalendarRange className="size-4 text-brand" />
                        Linha do tempo visual ({timeline.unitName})
                      </p>
                      <span className="text-xs text-slate-500">
                        Duração estimada: {timeline.maxUnit} {timeline.unitName.toLowerCase()}
                      </span>
                    </div>

                    {/* Escala superior */}
                    <div className="mt-3 grid grid-cols-12 gap-1 text-[10px] font-medium text-slate-400">
                      {Array.from({ length: Math.min(timeline.maxUnit, 12) }, (_, i) => (
                        <span key={i} className="text-center">
                          S{i + 1}
                        </span>
                      ))}
                    </div>

                    {/* Barras Gantt */}
                    <div className="mt-2 space-y-2">
                      {timeline.items.map((item, idx) => {
                        const leftPct = ((item.startUnit - 1) / timeline.maxUnit) * 100;
                        const widthPct =
                          ((item.endUnit - item.startUnit + 1) / timeline.maxUnit) * 100;
                        const color = PALETTE[idx % PALETTE.length];
                        return (
                          <div
                            key={item.label}
                            className="grid grid-cols-1 gap-1 sm:grid-cols-[200px_1fr_90px] sm:items-center sm:gap-3"
                          >
                            <span className="truncate text-xs font-medium text-slate-700">
                              {item.label}
                            </span>
                            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                              <div
                                className="absolute top-0 h-full rounded-full"
                                style={{
                                  left: `${Math.min(leftPct, 94)}%`,
                                  width: `${Math.max(widthPct, 6)}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                            <span className="text-right font-mono text-[11px] text-slate-500">
                              {item.periodLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          },
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}
