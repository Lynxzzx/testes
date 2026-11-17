import type { Tokens } from "marked";

export type InvestmentSlice = {
  label: string;
  amount: number;
  formatted: string;
  percentage: number;
};

export type TimelineBar = {
  label: string;
  periodLabel: string;
  startUnit: number;
  endUnit: number;
};

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/**
 * Extrai valor numérico em reais de uma string como "R$ 7.500,00" ou "R$ 1.200".
 */
export function parseBrlAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i) || cleaned.match(/\b(\d{1,3}(?:\.\d{3})+(?:,\d{2})?)\b/);
  if (!match) return null;
  const numStr = match[1].replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(numStr);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatBrl(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Analisa uma tabela Markdown e, se for uma tabela de Investimento (com valores R$),
 * retorna as fatias percentuais de cada item para renderizar um gráfico de distribuição.
 */
export function extractInvestmentChart(
  headers: string[],
  rows: string[][]
): { items: InvestmentSlice[]; total: number } | null {
  if (headers.length < 2 || rows.length < 2) return null;

  const headerJoined = headers.join(" ").toLowerCase();
  const looksLikeInvestment =
    /valor|investimento|preço|preco|custo|total|orçamento|orcamento|r\$/i.test(headerJoined) ||
    rows.some((r) => r.some((cell) => /R\$\s*\d/i.test(cell)));

  if (!looksLikeInvestment) return null;

  const parsedRows: { label: string; amount: number; formatted: string }[] = [];

  for (const row of rows) {
    const firstCell = stripMarkdown(row[0] ?? "");
    if (!firstCell || /^(total|subtotal|soma|investimento total)\b/i.test(firstCell)) {
      continue;
    }

    // Procura a célula com valor monetário (geralmente a última coluna)
    let foundAmount: number | null = null;
    for (let c = row.length - 1; c >= 1; c--) {
      const amt = parseBrlAmount(row[c] ?? "");
      if (amt !== null) {
        foundAmount = amt;
        break;
      }
    }

    if (foundAmount !== null && foundAmount > 0) {
      parsedRows.push({
        label: firstCell,
        amount: foundAmount,
        formatted: formatBrl(foundAmount),
      });
    }
  }

  if (parsedRows.length < 2) return null;

  const total = parsedRows.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return null;

  return {
    total,
    items: parsedRows.map((item) => ({
      ...item,
      percentage: Math.round((item.amount / total) * 1000) / 10,
    })),
  };
}

/**
 * Analisa uma tabela Markdown de Cronograma e extrai intervalos (ex: "Semana 1", "Semanas 3-4")
 * para desenhar um gráfico Gantt / Timeline horizontal.
 */
export function extractTimelineChart(
  headers: string[],
  rows: string[][]
): { items: TimelineBar[]; maxUnit: number; unitName: string } | null {
  if (headers.length < 2 || rows.length < 2) return null;

  const headerJoined = headers.join(" ").toLowerCase();
  const looksLikeTimeline = /prazo|semana|etapa|cronograma|duração|duracao|período|periodo|mês|mes|dia/i.test(
    headerJoined
  );
  if (!looksLikeTimeline) return null;

  // Não confundir tabela de investimento com cronograma
  if (rows.some((r) => r.some((c) => /R\$\s*\d/i.test(c)))) return null;

  const items: TimelineBar[] = [];
  let maxUnit = 0;
  let unitName = "Semanas";
  let runningCursor = 1;

  for (const row of rows) {
    const label = stripMarkdown(row[0] ?? "");
    const rawPeriod = stripMarkdown(row[row.length - 1] ?? "");
    if (!label || !rawPeriod) continue;

    if (/dia/i.test(rawPeriod)) unitName = "Dias";
    else if (/mês|mes|meses/i.test(rawPeriod)) unitName = "Meses";

    // Ex: "Semanas 3-4", "Semana 2 a 3", "Semana 1"
    const rangeMatch = rawPeriod.match(/(\d+)\s*(?:-|–|a|até|ate)\s*(\d+)/i);
    const singleMatch = rawPeriod.match(/(\d+)/);

    let startUnit = runningCursor;
    let endUnit = runningCursor;

    if (rangeMatch) {
      const a = Number.parseInt(rangeMatch[1], 10);
      const b = Number.parseInt(rangeMatch[2], 10);
      startUnit = Math.min(a, b);
      endUnit = Math.max(a, b);
      runningCursor = endUnit + 1;
    } else if (singleMatch) {
      const n = Number.parseInt(singleMatch[1], 10);
      // Se for "Semana 2" (ordinal), começa e termina na 2; se for "2 semanas" (duração), soma ao cursor
      if (/^(semana|mês|mes|dia|etapa|fase)\s*\d+/i.test(rawPeriod)) {
        startUnit = n;
        endUnit = n;
        runningCursor = n + 1;
      } else {
        startUnit = runningCursor;
        endUnit = runningCursor + Math.max(1, n) - 1;
        runningCursor = endUnit + 1;
      }
    } else {
      continue;
    }

    if (endUnit > maxUnit) maxUnit = endUnit;
    items.push({ label, periodLabel: rawPeriod, startUnit, endUnit });
  }

  if (items.length < 2 || maxUnit <= 0 || maxUnit > 60) return null;
  return { items, maxUnit, unitName };
}

export function extractChartFromMarkedTable(table: Tokens.Table) {
  const headers = table.header.map((h) => h.text);
  const rows = table.rows.map((r) => r.map((c) => c.text));
  return {
    investment: extractInvestmentChart(headers, rows),
    timeline: extractTimelineChart(headers, rows),
  };
}
