import { SECTIONS, TONES, type SectionKey, type Tone } from "@/lib/plans";
import type { ChatMessage } from "./openrouter";

export type CompanyInput = {
  name?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  responsible?: string;
  about?: string;
  differentials?: string;
};

const TONE_GUIDE: Record<Tone, string> = {
  formal:
    "Tom FORMAL: linguagem corporativa, impessoal e respeitosa. Use terceira pessoa para a empresa prestadora (\"a [Empresa]\") e trate o cliente com cordialidade institucional. Evite gírias e exageros.",
  consultivo:
    "Tom CONSULTIVO: demonstre entendimento profundo do problema do cliente, faça diagnóstico, explique o porquê de cada recomendação e posicione a empresa prestadora como parceira estratégica. Use primeira pessoa do plural (\"nós\").",
  direto:
    "Tom DIRETO: frases curtas e objetivas, foco em entregáveis, prazos e resultados mensuráveis. Sem rodeios ou floreios. Use primeira pessoa do plural.",
};

export const SYSTEM_PROMPT = `Você é um consultor comercial sênior brasileiro, especialista em redigir propostas comerciais B2B que convertem.
Sua tarefa é transformar os dados de <empresa_prestadora> e <cliente_e_briefing> em uma PROPOSTA COMERCIAL COMPLETA, profissional e pronta para envio em PDF.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO E LINGUAGEM
1. Escreva SEMPRE em português do Brasil, com ortografia e gramática impecáveis.
2. Responda SOMENTE com o documento em Markdown puro — sem comentários, sem preâmbulos ("Claro!", "Aqui está..."), sem blocos de código envolvendo o documento.
3. PROIBIÇÃO TOTAL DE LaTeX E ESCAPES:
   - É ESTRITAMENTE PROIBIDO usar sintaxe LaTeX, fórmulas matemáticas entre cifrões ($...$ ou $$...$$), comandos como \\hat{}, \\text{}, \\geq, \\leq, \\times ou barras invertidas antes de cifrão (\\$).
   - Escreva valores monetários SEMPRE em texto puro no formato brasileiro: R$ 20.000,00 ou R$ 800,00/mês (sempre com espaço após "R$" e sem barras invertidas).
   - Escreva unidades de tempo, taxas e métricas por extenso ou em texto simples com espaço entre número e palavra: "2 horas", "1 semana", "2 semanas", "30 dias", "20 mil", "maior ou igual a 90" (ou ">= 90"). NUNCA escreva "$2/h$", "$20/mil$", "$>=/90$" ou "1semana".
4. Estrutura do Markdown:
   - A primeira linha deve ser o título da proposta em H1 (# ...).
   - Logo abaixo, uma linha em itálico com "Preparada para: <nome do cliente> · <data>".
   - Cada seção principal em H2 (## ...), subseções em H3 (### ...).
   - Use listas simples de um único nível com "- " para entregáveis e benefícios (evite listas aninhadas complexas ou itens vazios).
   - Use TABELAS Markdown bem formadas para Cronograma (Etapa | Atividades Principais | Prazo) e Investimento (Etapa / Entregável | Descrição | Valor).
   - Use **negrito** com moderação para destacar números, totais e conclusões.

REGRAS DE SEPARAÇÃO DE CONTEXTO (CLIENTE vs. PRESTADOR)
5. Você receberá os dados separados nas tags <empresa_prestadora> (quem envia a proposta e executará o serviço) e <cliente_e_briefing> (quem contratou/receberá a proposta).
6. NUNCA inverta ou misture os dados do cliente com os da empresa prestadora:
   - Na seção "Por que nós" (Diferenciais), destaque APENAS a expertise técnica, metodologia, histórico e diferenciais da <empresa_prestadora>.
   - NUNCA atribua métricas, estrutura, número de clínicas/unidades, casos clínicos atendidos, avaliações do Google ou conquistas mencionadas no <cliente_e_briefing> como se fossem da <empresa_prestadora>. As métricas do cliente devem ser citadas apenas no contexto do desafio/objetivo do cliente.

REGRAS DE PRECIFICAÇÃO E ORÇAMENTO
7. DISTRIBUIÇÃO INTELIGENTE DO INVESTIMENTO:
   - Quando o <cliente_e_briefing> informar um teto, faixa ou meta de orçamento (ex: "até R$ 20.000,00", "orçamento de R$ 18 mil", "verba disponível de R$ 15.000"), distribua proporcionalmente os valores estimados entre cada etapa/item na tabela de Investimento (em formato R$ X.XXX,00) para que a soma bata com o orçamento informado, incluindo uma última linha de **Total** na tabela.
   - Se houver custos recorrentes mencionados no briefing (ex: hospedagem, manutenção mensal), apresente-os claramente em texto ou linha separada (ex: R$ 800,00/mês) sem somá-los de forma confusa ao escopo fixo de implantação.
   - NUNCA preencha a tabela com "R$ [a definir]" quando o briefing já trouxer um valor ou teto de orçamento. Só use "A definir" se absolutamente nenhum valor ou faixa de orçamento for mencionado no briefing.
8. Respeite fielmente prazos, tecnologias e restrições informados no briefing.
9. Não inclua seção de assinatura nem bloco de contatos no final — o cabeçalho e o rodapé institucionais do PDF já exibem essas informações.
10. Tamanho alvo: entre 650 e 1.400 palavras, proporcional à complexidade do projeto.`;

export function buildProposalMessages(input: {
  title: string;
  clientName?: string;
  brief: string;
  tone: Tone;
  sections: SectionKey[];
  company: CompanyInput;
  suggestMarketPricing?: boolean;
}): ChatMessage[] {
  const today = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  const sectionList = (input.sections.length ? input.sections : (Object.keys(SECTIONS) as SectionKey[]))
    .map((s, i) => `${i + 1}. ${SECTIONS[s]}`)
    .join("\n");

  const c = input.company;
  const companyLines = [
    c.name && `Nome da empresa prestadora: ${c.name}`,
    c.cnpj && `CNPJ: ${c.cnpj}`,
    c.responsible && `Responsável comercial/técnico: ${c.responsible}`,
    c.website && `Site: ${c.website}`,
    c.address && `Localização: ${c.address}`,
    c.about && `Sobre a empresa prestadora: ${c.about}`,
    c.differentials && `Diferenciais competitivos da prestadora: ${c.differentials}`,
  ]
    .filter(Boolean)
    .join("\n");

  const user = `## Metadados da proposta
Título da proposta: ${input.title}
Data de emissão: ${today}

## Tom de escrita
${TONE_GUIDE[input.tone]}

## Seções obrigatórias (nesta ordem exata, como H2 "##")
${sectionList}

<empresa_prestadora>
${companyLines || "Nome: Nossa Empresa (use apenas expertise técnica e metodologia compatíveis com o serviço proposto, sem inventar números factuais não informados)"}
</empresa_prestadora>

<cliente_e_briefing>
Nome do cliente (quem recebe a proposta): ${input.clientName || "(identificar a partir do briefing abaixo)"}
Briefing do projeto:
"""
${input.brief.trim()}
"""
</cliente_e_briefing>

LEMBRETES CRÍTICOS ANTES DE REDIGIR:
- Na seção "Por que nós", destaque APENAS a expertise técnica, metodologia e diferenciais da <empresa_prestadora>. Nunca atribua métricas ou conquistas do cliente (<cliente_e_briefing>) à empresa prestadora.
- Se o briefing mencionar orçamento ou teto de valor, distribua os valores entre os itens da tabela de Investimento para somar dentro desse orçamento (formato R$ X.XXX,00).
${
  input.suggestMarketPricing
    ? `- SUGESTÃO INTELIGENTE DE PREÇO DE MERCADO ATIVADA: Caso o briefing NÃO mencione um valor ou orçamento fechado, estime uma faixa de preço justa e realista praticada no mercado brasileiro B2B para o porte e escopo descritos (em R$ X.XXX,00), distribua os valores proporcionalmente entre cada etapa na tabela de Investimento somando o **Total** (NÃO use "A definir") e aplique **ancoragem de preço** antes da tabela (contextualizando o retorno sobre o investimento e o custo de não resolver o problema antes de mostrar o preço).`
    : ""
}
- NÃO use LaTeX, NÃO use $...$ para matemática ou métricas e NÃO use \\$ com barra invertida.

Gere agora a proposta comercial completa em Markdown.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

const LATEX_ACCENTS: Array<[RegExp, string]> = [
  [/\\hat\{?a\}?/g, "â"],
  [/\\hat\{?e\}?/g, "ê"],
  [/\\hat\{?o\}?/g, "ô"],
  [/\\tilde\{?a\}?/g, "ã"],
  [/\\tilde\{?o\}?/g, "õ"],
  [/\\acute\{?a\}?/g, "á"],
  [/\\acute\{?e\}?/g, "é"],
  [/\\acute\{?i\}?/g, "í"],
  [/\\acute\{?o\}?/g, "ó"],
  [/\\acute\{?u\}?/g, "ú"],
  [/\\grave\{?a\}?/g, "à"],
  [/\\c\{?c\}?/g, "ç"],
];

/**
 * Limpa artefatos de LaTeX, escapes de cifrão (`\$`), delimitadores matemáticos (`$...$`)
 * e palavras coladas em números (`1semana` -> `1 semana`).
 */
export function sanitizeProposalMarkdown(md: string): string {
  if (!md) return "";
  let out = md.trim();

  // 0. Normaliza espaços, hífens e aspas Unicode (ex: \u202F Narrow No-Break Space que vira "/"
  //    em WinAnsi/Helvetica, e \u2011 Non-Breaking Hyphen que desaparece em E-commerce / 3-4)
  out = out
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 1. Remove cercas de código envolvendo o documento inteiro
  out = out.replace(/^```(?:markdown|md)?\s*\n/i, "").replace(/\n```\s*$/i, "");

  // 2. Converte acentos LaTeX (ex: m\hat{e}s -> mês)
  for (const [pattern, replacement] of LATEX_ACCENTS) {
    out = out.replace(pattern, replacement);
  }

  // 3. Desescapa sequências LaTeX/Markdown indesejadas (garante remoção de R\$)
  out = out
    .replace(/\\\$/g, "$")
    .replace(/\\+\$/g, "$")
    .replace(/\\+%/g, "%")
    .replace(/\\+&/g, "&")
    .replace(/\\(?:text|mathrm|mathbf|textbf|textit|mathit)\{([^}]*)\}/g, "$1")
    .replace(/\\(?:geq|ge)\b/g, ">=")
    .replace(/\\(?:leq|le)\b/g, "<=")
    .replace(/\\times\b/g, "x")
    .replace(/\\approx\b/g, "~")
    .replace(/\\pm\b/g, "+/-");

  // 4. Remove delimitadores LaTeX em bloco $$...$$, \[...\], \(...\)
  out = out
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1");

  // 5. Corrige casos onde a IA abriu com R$ (ou $(R$) e fechou com $ no final:
  out = out
    .replace(/\$\(\s*R\$\s*([^$\n)]+?)\s*\)\$/g, "(R$ $1)")
    .replace(/\(\s*\$\s*R\$\s*([^$\n)]+?)\s*\$\s*\)/g, "(R$ $1)")
    .replace(/(R\$\s*[\d.,]+(?:\s*\/\s*[a-zA-ZÀ-ÿ]+)?)\$/g, "$1");

  // 6. Remove delimitadores matemáticos inline $...$ quando o primeiro $ NÃO faz parte de R$ / US$
  out = out.replace(/(?<![A-Za-z])\$([^$\n]{1,80})\$/g, (_match, inner: string) => {
    return inner.trim();
  });

  // 7. Limpa barras indevidas entre números e unidades/símbolos (ex: 3/horas/dia -> 3 horas/dia,
  //    60/dias -> 60 dias, 100/% -> 100%, 10/kg -> 10 kg, 4/h -> 4 h, >=/90 -> >= 90)
  out = out
    .replace(/([<>]=?)\s*\/\s*(\d+)/g, "$1 $2")
    .replace(/\b(\d+)\s*\/\s*%/g, "$1%")
    .replace(
      /\b(\d+)\s*\/\s*(horas?|h|dias?|semanas?|meses|mês|anos?|minutos?|min|segundos?|s|kg|g|mg|mil|milhão|milhões|unidades?|cliques?)\b/gi,
      "$1 $2"
    );

  // 8. Garante espaço após R$ quando vier colado ao número (ex: R$20.000 -> R$ 20.000)
  out = out.replace(/\bR\$(\d)/g, "R$ $1");

  // 9. Garante espaço entre números e unidades de tempo/medida em português
  out = out.replace(
    /\b(\d+)(semana|semanas|dia|dias|mês|mes|meses|ano|anos|hora|horas|minuto|minutos|segundo|segundos|unidade|unidades|clínica|clínicas|etapa|etapas|fase|fases|página|páginas|módulo|módulos|usuário|usuários|mil)\b/gi,
    "$1 $2"
  );

  return out.trim();
}

/** Mantém compatibilidade com o pipeline de geração. */
export function cleanModelOutput(md: string) {
  return sanitizeProposalMarkdown(md);
}

export { TONES };
