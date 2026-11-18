import React from "react";
import { Document, Font, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { marked, type Token, type Tokens } from "marked";
import { sanitizeProposalMarkdown } from "@/lib/ai/prompts";
import { extractChartFromMarkedTable, formatBrl } from "@/lib/proposal-charts";

const CHART_PALETTE = [
  "#4f46e5",
  "#7c3aed",
  "#0284c7",
  "#0d9488",
  "#d97706",
  "#e11d48",
  "#475569",
];

// Desativa a hifenização automática em inglês do @react-pdf/renderer para nunca
// remover ou quebrar hífens em palavras compostas (E-commerce, e-mail, Semanas 3-4).
Font.registerHyphenationCallback((word) => [word]);

const ACCENT = "#4f46e5";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const SOFT = "#f8fafc";

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 68,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.55,
    color: INK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "60%",
  },
  logo: { maxHeight: 34, maxWidth: 110, objectFit: "contain" },
  companyTitleBlock: { flexDirection: "column" },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    lineHeight: 1.25,
    color: INK,
  },
  companySubtitle: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerRight: {
    maxWidth: "38%",
    alignItems: "flex-end",
  },
  headerMetaBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#334155",
    textAlign: "right",
    lineHeight: 1.4,
  },
  headerMeta: {
    fontSize: 8,
    color: MUTED,
    textAlign: "right",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    fontSize: 8,
    color: MUTED,
  },
  accentBar: {
    width: 44,
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginBottom: 12,
  },
  h1: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    lineHeight: 1.22,
    marginBottom: 6,
    color: INK,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13.5,
    color: INK,
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.2,
    color: ACCENT,
    marginTop: 12,
    marginBottom: 4,
  },
  h4: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginTop: 8,
    marginBottom: 3,
  },
  p: { marginBottom: 7 },
  subtitle: { color: MUTED, marginBottom: 14, fontSize: 10 },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3.5,
    paddingRight: 6,
  },
  bullet: {
    width: 14,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
  },
  subBullet: {
    width: 14,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
  },
  listContent: { flex: 1 },
  blockquote: {
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    backgroundColor: SOFT,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    color: "#1e293b",
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: SOFT,
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
  },
  hr: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 12 },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginVertical: 8,
  },
  theadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SOFT,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  trEven: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#fcfcfd",
  },
  trLast: { flexDirection: "row" },
  th: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: INK,
  },
  td: {
    paddingVertical: 6.5,
    paddingHorizontal: 8,
    fontSize: 9.5,
    lineHeight: 1.4,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  boldItalic: { fontFamily: "Helvetica-BoldOblique" },
  link: { color: ACCENT, textDecoration: "none" },
  watermark: {
    position: "absolute",
    top: 360,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 64,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    opacity: 0.045,
    transform: "rotate(-30deg)",
  },
});

export type PdfCompany = {
  name?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  logo?: string | null;
  brandColor?: string | null;
};

export type PdfSignature = {
  signerName?: string | null;
  signerDocument?: string | null;
  signatureImage?: string | null;
  signedAt?: Date | string | null;
  signerIp?: string | null;
};

/**
 * Converte caracteres Unicode fora da tabela WinAnsi (Helvetica) para seus equivalentes
 * ASCII/Latin-1 seguros:
 * - \u202F (Narrow No-Break Space) em WinAnsi tem byte inferior 0x2F ('/'), o que gerava
 *   "3/horas/dia", "60/dias", "100/%". Convertido para espaço normal " ".
 * - \u2011 (Non-Breaking Hyphen) em WinAnsi tem byte inferior 0x11 (invisível), o que apagava
 *   o hífen em "E-commerce", "e-mail", "Semanas 3-4". Convertido para hífen ASCII "-".
 */
function sanitize(text: string) {
  return text
    .replace(/\\\$/g, "$")
    .replace(/\\+\$/g, "$")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\u2192\u279C\u27A1]/g, "->")
    .replace(/[\u2713\u2714\u2705]/g, "•")
    .replace(/[\u2264]/g, "<=")
    .replace(/[\u2265]/g, ">=")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");
}

type Style = (typeof s)[keyof typeof s];

function renderInline(
  tokens: Token[] | undefined,
  keyPrefix = "i",
  inherited: { bold?: boolean; italic?: boolean } = {},
  accent = ACCENT
): React.ReactNode[] {
  if (!tokens) return [];
  return tokens.map((tok, idx) => {
    const key = `${keyPrefix}-${idx}`;
    const style: Style | undefined =
      inherited.bold && inherited.italic
        ? s.boldItalic
        : inherited.bold
          ? s.bold
          : inherited.italic
            ? s.italic
            : undefined;

    switch (tok.type) {
      case "strong":
        return (
          <Text key={key} style={inherited.italic ? s.boldItalic : s.bold}>
            {renderInline((tok as Tokens.Strong).tokens, key, { ...inherited, bold: true }, accent)}
          </Text>
        );
      case "em":
        return (
          <Text key={key} style={inherited.bold ? s.boldItalic : s.italic}>
            {renderInline((tok as Tokens.Em).tokens, key, { ...inherited, italic: true }, accent)}
          </Text>
        );
      case "codespan":
        return (
          <Text key={key} style={{ fontFamily: "Courier" }}>
            {sanitize((tok as Tokens.Codespan).text)}
          </Text>
        );
      case "link": {
        const l = tok as Tokens.Link;
        return (
          <Link key={key} src={l.href} style={[s.link, { color: accent }]}>
            {renderInline(l.tokens, key, inherited, accent)}
          </Link>
        );
      }
      case "br":
        return <Text key={key}>{"\n"}</Text>;
      case "del":
        return (
          <Text key={key} style={{ textDecoration: "line-through" }}>
            {renderInline((tok as Tokens.Del).tokens, key, inherited, accent)}
          </Text>
        );
      case "text": {
        const t = tok as Tokens.Text;
        if (t.tokens?.length) {
          return (
            <Text key={key} style={style}>
              {renderInline(t.tokens, key, inherited, accent)}
            </Text>
          );
        }
        return (
          <Text key={key} style={style}>
            {sanitize(t.text)}
          </Text>
        );
      }
      case "escape":
        return <Text key={key}>{sanitize((tok as Tokens.Escape).text)}</Text>;
      default:
        return <Text key={key}>{sanitize((tok as { raw?: string }).raw ?? "")}</Text>;
    }
  });
}

function columnWeights(table: Tokens.Table) {
  const cols = table.header.length;
  return Array.from({ length: cols }, (_, c) => {
    const cells = [table.header[c], ...table.rows.map((r) => r[c])].filter(Boolean);
    const avg =
      cells.reduce((sum, cell) => sum + (cell?.text?.length ?? 0), 0) / Math.max(cells.length, 1);
    return Math.min(Math.max(avg, 8), 55);
  });
}

function hasVisibleText(tokens: Token[]): boolean {
  for (const t of tokens) {
    if (t.type === "space") continue;
    const text = (t as { text?: string; raw?: string }).text ?? (t as { raw?: string }).raw ?? "";
    if (sanitize(text).trim().length > 0) return true;
  }
  return false;
}

function renderList(list: Tokens.List, key: string, depth = 0, accent = ACCENT): React.ReactNode {
  const start = typeof list.start === "number" ? list.start : 1;
  let visibleIndex = 0;

  return (
    <View key={key} style={{ marginBottom: depth === 0 ? 7 : 3, marginLeft: depth * 14 }}>
      {list.items.map((item, i) => {
        const inlineChildren = item.tokens.filter((c) => c.type !== "list" && c.type !== "space");
        const nestedLists = item.tokens.filter((c): c is Tokens.List => c.type === "list");
        const showBulletRow = hasVisibleText(inlineChildren);

        if (!showBulletRow && nestedLists.length === 0) return null;

        const currentNumber = start + visibleIndex;
        if (showBulletRow) visibleIndex++;

        const marker = list.ordered ? `${currentNumber}.` : depth === 0 ? "•" : "–";

        return (
          <View key={`${key}-${i}`}>
            {showBulletRow && (
              <View style={s.listItem} wrap={false}>
                <Text style={depth === 0 ? [s.bullet, { color: accent }] : s.subBullet}>{marker}</Text>
                <View style={s.listContent}>
                  {inlineChildren.map((child, j) => {
                    const ck = `${key}-${i}-${j}`;
                    if (child.type === "text" || child.type === "paragraph") {
                      const t = child as Tokens.Text | Tokens.Paragraph;
                      return (
                        <Text key={ck}>
                          {t.tokens ? renderInline(t.tokens, ck, {}, accent) : sanitize(t.text)}
                        </Text>
                      );
                    }
                    return renderBlock(child, ck, depth + 1, false, accent);
                  })}
                </View>
              </View>
            )}
            {nestedLists.map((sub, sIdx) => renderList(sub, `${key}-${i}-sub-${sIdx}`, depth + 1, accent))}
          </View>
        );
      })}
    </View>
  );
}

function renderBlock(tok: Token, key: string, depth = 0, isFirst = false, accent = ACCENT): React.ReactNode {
  const palette = [accent, ...CHART_PALETTE.filter((c) => c.toLowerCase() !== accent.toLowerCase())];

  switch (tok.type) {
    case "heading": {
      const h = tok as Tokens.Heading;
      const children = renderInline(h.tokens, key, {}, accent);
      if (h.depth === 1)
        return (
          <View key={key} wrap={false} minPresenceAhead={120}>
            {isFirst && <View style={[s.accentBar, { backgroundColor: accent }]} />}
            <Text style={s.h1}>{children}</Text>
          </View>
        );
      if (h.depth === 2)
        return (
          <Text
            key={key}
            style={[s.h2, { borderBottomColor: accent, borderBottomWidth: 1.5 }]}
            minPresenceAhead={140}
            wrap={false}
          >
            {children}
          </Text>
        );
      if (h.depth === 3)
        return (
          <Text key={key} style={[s.h3, { color: accent }]} minPresenceAhead={90} wrap={false}>
            {children}
          </Text>
        );
      return (
        <Text key={key} style={s.h4} minPresenceAhead={70} wrap={false}>
          {children}
        </Text>
      );
    }
    case "paragraph": {
      const p = tok as Tokens.Paragraph;
      const isSubtitle = p.tokens.length === 1 && p.tokens[0].type === "em";
      return (
        <Text key={key} style={isSubtitle ? s.subtitle : s.p}>
          {renderInline(p.tokens, key, {}, accent)}
        </Text>
      );
    }
    case "list":
      return renderList(tok as Tokens.List, key, depth, accent);
    case "blockquote": {
      const b = tok as Tokens.Blockquote;
      return (
        <View
          key={key}
          style={[s.blockquote, { borderColor: accent, borderLeftColor: accent }]}
          wrap={false}
        >
          {b.tokens.map((t, i) => renderBlock(t, `${key}-${i}`, depth + 1, false, accent))}
        </View>
      );
    }
    case "code":
      return (
        <Text key={key} style={s.code}>
          {sanitize((tok as Tokens.Code).text)}
        </Text>
      );
    case "hr":
      return <View key={key} style={s.hr} />;
    case "table": {
      const t = tok as Tokens.Table;
      const weights = columnWeights(t);
      const allowTableWrap = t.rows.length > 10;
      const { investment, timeline } = extractChartFromMarkedTable(t);

      return (
        <View key={key}>
          <View style={[s.table, { borderColor: BORDER }]} wrap={allowTableWrap}>
            <View
              style={[s.theadRow, { borderBottomColor: accent, borderBottomWidth: 1.5 }]}
              wrap={false}
              fixed={allowTableWrap}
            >
              {t.header.map((cell, c) => (
                <Text
                  key={c}
                  style={[
                    s.th,
                    { flex: weights[c], color: accent },
                    t.align[c] === "right" ? { textAlign: "right" } : {},
                    t.align[c] === "center" ? { textAlign: "center" } : {},
                  ]}
                >
                  {renderInline(cell.tokens, `${key}-h${c}`, {}, accent)}
                </Text>
              ))}
            </View>
            {t.rows.map((row, r) => {
              const isLast = r === t.rows.length - 1;
              const rowStyle = isLast ? s.trLast : r % 2 === 1 ? s.trEven : s.tr;
              return (
                <View key={r} style={rowStyle} wrap={false}>
                  {row.map((cell, c) => (
                    <Text
                      key={c}
                      style={[
                        s.td,
                        { flex: weights[c] },
                        t.align[c] === "right" ? { textAlign: "right" } : {},
                        t.align[c] === "center" ? { textAlign: "center" } : {},
                      ]}
                    >
                      {renderInline(cell.tokens, `${key}-${r}-${c}`, {}, accent)}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>

          {/* Gráfico visual automático de distribuição do investimento */}
          {investment ? (
            <View
              wrap={false}
              style={{
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: SOFT,
                borderRadius: 4,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: INK }}>
                  DISTRIBUIÇÃO PROPORCIONAL DO INVESTIMENTO
                </Text>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: accent }}>
                  Total: {sanitize(formatBrl(investment.total))}
                </Text>
              </View>

              {/* Barra empilhada 100% */}
              <View
                style={{
                  flexDirection: "row",
                  height: 7,
                  borderRadius: 3,
                  overflow: "hidden",
                  backgroundColor: "#e2e8f0",
                  marginBottom: 8,
                }}
              >
                {investment.items.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flex: Math.max(item.percentage, 3),
                      backgroundColor: palette[idx % palette.length],
                    }}
                  />
                ))}
              </View>

              {investment.items.map((item, idx) => {
                const color = palette[idx % palette.length];
                return (
                  <View key={idx} style={{ marginBottom: 4 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <Text style={{ fontSize: 8.5, color: INK }}>
                        • {sanitize(item.label)}
                      </Text>
                      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: INK }}>
                        {sanitize(item.formatted)} ({item.percentage}%)
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 2,
                        flexDirection: "row",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(item.percentage, 2)}%`,
                          backgroundColor: color,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Gráfico Gantt visual do Cronograma */}
          {timeline ? (
            <View
              wrap={false}
              style={{
                borderWidth: 1,
                borderColor: BORDER,
                backgroundColor: SOFT,
                borderRadius: 4,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: INK }}>
                  MAPA VISUAL DO CRONOGRAMA ({sanitize(timeline.unitName.toUpperCase())})
                </Text>
                <Text style={{ fontSize: 8, color: MUTED }}>
                  Horizonte total: {timeline.maxUnit} {sanitize(timeline.unitName.toLowerCase())}
                </Text>
              </View>

              {timeline.items.map((item, idx) => {
                const leftPct = Math.min(((item.startUnit - 1) / timeline.maxUnit) * 100, 92);
                const widthPct = Math.max(
                  ((item.endUnit - item.startUnit + 1) / timeline.maxUnit) * 100,
                  8
                );
                const color = palette[idx % palette.length];
                return (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ width: "38%", fontSize: 8, color: INK, paddingRight: 6 }}>
                      {sanitize(item.label)}
                    </Text>
                    <View
                      style={{
                        width: "44%",
                        height: 6,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 3,
                        position: "relative",
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          left: `${leftPct}%`,
                          width: `${Math.min(widthPct, 100 - leftPct)}%`,
                          top: 0,
                          bottom: 0,
                          backgroundColor: color,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        width: "18%",
                        fontSize: 8,
                        color: MUTED,
                        textAlign: "right",
                      }}
                    >
                      {sanitize(item.periodLabel)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      );
    }
    case "space":
    case "html":
      return null;
    default: {
      const raw = (tok as { text?: string; raw?: string }).text ?? (tok as { raw?: string }).raw ?? "";
      return raw.trim() ? (
        <Text key={key} style={s.p}>
          {sanitize(raw)}
        </Text>
      ) : null;
    }
  }
}

/**
 * Agrupa cada heading (h1..h4) com o bloco imediatamente seguinte (tabela, parágrafo ou citação)
 * dentro de um `<View wrap={false}>` para garantir comportamento idêntico a
 * `break-after: avoid; page-break-after: avoid;` — nunca deixando títulos como "Cronograma"
 * ou "Investimento" sozinhos no fim de uma página.
 */
function renderTokensWithKeepTogether(
  tokens: Token[],
  firstContentIdx: number,
  accent: string
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "space" || tok.type === "html") {
      i++;
      continue;
    }

    if (tok.type === "heading") {
      let nextIdx = i + 1;
      while (nextIdx < tokens.length && tokens[nextIdx].type === "space") {
        nextIdx++;
      }
      const nextTok = tokens[nextIdx];

      const canGroupWithNext =
        nextTok &&
        (nextTok.type === "paragraph" ||
          nextTok.type === "blockquote" ||
          (nextTok.type === "table" && (nextTok as Tokens.Table).rows.length <= 10));

      if (canGroupWithNext) {
        elements.push(
          <View key={`keep-${i}`} wrap={false}>
            {renderBlock(tok, `b-${i}`, 0, i === firstContentIdx, accent)}
            {renderBlock(nextTok, `b-${nextIdx}`, 0, false, accent)}
          </View>
        );
        i = nextIdx + 1;
        continue;
      }
    }

    elements.push(renderBlock(tok, `b-${i}`, 0, i === firstContentIdx, accent));
    i++;
  }

  return elements;
}

export function ProposalDocument({
  title,
  content,
  company,
  watermark,
  signature,
}: {
  title: string;
  content: string;
  company: PdfCompany;
  watermark: boolean;
  signature?: PdfSignature | null;
}) {
  const accent =
    company.brandColor && /^#[0-9a-fA-F]{6}$/.test(company.brandColor)
      ? company.brandColor
      : ACCENT;
  const cleanedMarkdown = sanitizeProposalMarkdown(content || "").replace(/\\\$/g, "$");
  const tokens = marked.lexer(cleanedMarkdown, { gfm: true });
  const firstContentIdx = tokens.findIndex((t) => t.type !== "space");

  const contactLine = [company.email, company.phone, company.website].filter(Boolean).join("  ·  ");
  const hasSignature = Boolean(signature?.signerName || signature?.signatureImage);
  const signedDateStr = signature?.signedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(
        typeof signature.signedAt === "string"
          ? new Date(signature.signedAt)
          : signature.signedAt
      )
    : "";

  return (
    <Document
      title={sanitize(title)}
      author={sanitize(company.name || "PropostaAI")}
      creator="PropostaAI"
      producer="PropostaAI"
    >
      <Page size="A4" style={s.page}>
        {/* Cabeçalho institucional fixo em fluxo normal */}
        <View style={[s.header, { borderBottomColor: accent }]} fixed>
          <View style={s.headerLeft}>
            {company.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={company.logo} style={s.logo} />
            ) : null}
            <View style={s.companyTitleBlock}>
              <Text style={s.companyName}>{sanitize(company.name || "Proposta Comercial")}</Text>
              {company.name ? (
                <Text style={[s.companySubtitle, { color: accent }]}>Proposta Comercial</Text>
              ) : null}
            </View>
          </View>
          <View style={s.headerRight}>
            {company.cnpj ? (
              <Text style={s.headerMetaBold}>CNPJ: {sanitize(company.cnpj)}</Text>
            ) : null}
            {company.address ? (
              <Text style={s.headerMeta}>{sanitize(company.address)}</Text>
            ) : null}
          </View>
        </View>

        {watermark ? (
          <Text style={s.watermark} fixed>
            PropostaAI
          </Text>
        ) : null}

        {renderTokensWithKeepTogether(tokens, firstContentIdx, accent)}

        {/* Certificado de Aceite e Assinatura Digital (exibido no final do PDF quando aprovada) */}
        {hasSignature ? (
          <View
            wrap={false}
            style={{
              marginTop: 22,
              borderWidth: 1.5,
              borderColor: accent,
              backgroundColor: SOFT,
              borderRadius: 6,
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: BORDER,
                paddingBottom: 8,
                marginBottom: 10,
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: "Helvetica-Bold",
                    fontSize: 10,
                    color: accent,
                  }}
                >
                  CERTIFICADO DE ACEITE E ASSINATURA DIGITAL
                </Text>
                <Text style={{ fontSize: 8, color: MUTED, marginTop: 1 }}>
                  Documento aprovado eletronicamente com registro de autoria e auditoria
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Helvetica-Bold",
                  fontSize: 8.5,
                  color: "#047857",
                }}
              >
                STATUS: APROVADA
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 8.5, color: INK }}>
                  <Text style={s.bold}>Signatário: </Text>
                  {sanitize(signature?.signerName || "Cliente")}
                </Text>
                {signature?.signerDocument ? (
                  <Text style={{ fontSize: 8.5, color: INK }}>
                    <Text style={s.bold}>CPF / CNPJ: </Text>
                    {sanitize(signature.signerDocument)}
                  </Text>
                ) : null}
                {signedDateStr ? (
                  <Text style={{ fontSize: 8.5, color: INK }}>
                    <Text style={s.bold}>Data e hora do aceite: </Text>
                    {sanitize(signedDateStr)}
                  </Text>
                ) : null}
                {signature?.signerIp ? (
                  <Text style={{ fontSize: 8.5, color: INK }}>
                    <Text style={s.bold}>IP de registro: </Text>
                    {sanitize(signature.signerIp)}
                  </Text>
                ) : null}
              </View>

              {signature?.signatureImage ? (
                <View
                  style={{
                    width: 170,
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 4,
                    padding: 8,
                  }}
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image
                    src={signature.signatureImage}
                    style={{ maxHeight: 48, maxWidth: 150, objectFit: "contain" }}
                  />
                  <View
                    style={{
                      marginTop: 4,
                      paddingTop: 3,
                      borderTopWidth: 1,
                      borderTopColor: BORDER,
                      width: "100%",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 7,
                        color: MUTED,
                        textAlign: "center",
                      }}
                    >
                      Assinatura Digital do Aprovador
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Rodapé fixo com contatos e paginação */}
        <View style={s.footer} fixed>
          <Text style={{ flex: 1 }}>
            {sanitize(contactLine || company.name || "")}
            {watermark ? "   ·   Gerado com PropostaAI" : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
