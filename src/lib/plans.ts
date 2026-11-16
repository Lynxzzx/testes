export type PlanId = "free" | "pro";

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    price: 0,
    monthlyLimit: 3,
    historyDays: 30,
    watermark: true,
    features: [
      "3 propostas por mês",
      "Exportação em PDF",
      "Dados da empresa salvos",
      "Histórico dos últimos 30 dias",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    price: 39,
    monthlyLimit: Infinity,
    historyDays: Infinity,
    watermark: false,
    features: [
      "Propostas ilimitadas",
      "PDF sem marca d'água",
      "Histórico completo",
      "Todos os tons e seções",
      "Suporte prioritário",
    ],
  },
};

export function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const TONES = {
  formal: {
    label: "Formal",
    description: "Linguagem corporativa, objetiva e respeitosa.",
  },
  consultivo: {
    label: "Consultivo",
    description: "Foco no problema do cliente e em recomendações.",
  },
  direto: {
    label: "Direto",
    description: "Frases curtas, sem rodeios, foco em resultado.",
  },
} as const;

export type Tone = keyof typeof TONES;

export const SECTIONS = {
  resumo: "Resumo executivo",
  contexto: "Entendimento do desafio",
  escopo: "Escopo e entregáveis",
  metodologia: "Metodologia",
  cronograma: "Cronograma",
  investimento: "Investimento",
  diferenciais: "Por que nós",
  termos: "Condições comerciais",
  proximos: "Próximos passos",
} as const;

export type SectionKey = keyof typeof SECTIONS;

export const DEFAULT_SECTIONS: SectionKey[] = [
  "resumo",
  "contexto",
  "escopo",
  "cronograma",
  "investimento",
  "diferenciais",
  "proximos",
];
