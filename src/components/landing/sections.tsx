import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardPaste,
  Download,
  FileSignature,
  Gauge,
  Layers,
  PenLine,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { PricingCards } from "@/components/pricing-cards";
import { Button } from "@/components/ui/button";

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-pretty text-muted-foreground">{description}</p>}
    </div>
  );
}

export function SocialProof() {
  const items = ["Agências", "Consultorias", "Software houses", "Freelancers", "Arquitetos", "Eventos"];
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-sm text-muted-foreground">Feito para quem vive de vender serviços:</p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium text-foreground/70">
          {items.map((i) => (
            <span key={i}>{i}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      icon: ClipboardPaste,
      title: "Cole o brief",
      text: "E-mail, transcrição de reunião ou anotações soltas. A IA entende o contexto, as dores e o objetivo do cliente.",
    },
    {
      icon: Building2,
      title: "Adicione sua empresa",
      text: "Nome, CNPJ, contatos e diferenciais. Salve uma vez como padrão e reutilize em todas as propostas.",
    },
    {
      icon: Wand2,
      title: "Gere, edite e envie",
      text: "Escolha o tom e as seções. Revise o texto gerado, ajuste o que quiser e baixe um PDF com a sua marca.",
    },
  ];
  return (
    <section id="como-funciona" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Como funciona"
          title="Três passos. Nenhuma página em branco."
          description="Pare de copiar e colar propostas antigas. Cada proposta é escrita sob medida para o cliente."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                  <s.icon className="size-5 text-brand" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Gráficos de Impacto Comercial logo abaixo do texto explicativo */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Gráfico 1: Tempo gasto por proposta */}
          <div className="rounded-2xl border bg-background p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Eficiência operacional
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Tempo médio para montar 1 proposta
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                -98% de tempo
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Comparativo real entre redigir do zero no Word/Docs e gerar na Propoz.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    Processo manual (Word + formatação + tabelas)
                  </span>
                  <span className="font-mono font-semibold text-foreground">~3h 40min</span>
                </div>
                <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="bg-slate-400" style={{ width: "45%" }} title="Escrita do texto" />
                  <div className="bg-slate-500" style={{ width: "30%" }} title="Montagem de tabelas" />
                  <div className="bg-slate-600" style={{ width: "25%" }} title="Ajuste de layout PDF" />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>Escrita (1h40)</span>
                  <span>Escopo e preços (1h)</span>
                  <span>Formatação PDF (1h)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand">Com Propoz (Brief → PDF + Link pronto)</span>
                  <span className="font-mono font-semibold text-brand">2 min</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-brand/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand to-violet-500" style={{ width: "6%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 2: Taxa de fechamento vs Velocidade de envio */}
          <div className="rounded-2xl border bg-background p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Impacto na conversão
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Taxa de fechamento por tempo de envio
                </h3>
              </div>
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                2,4x mais vendas
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enviar a proposta ainda com a reunião fresca na memória do cliente multiplica a chance de aceite.
            </p>

            <div className="mt-6 grid grid-cols-4 items-end gap-3 pt-4" style={{ height: 148 }}>
              {[
                { label: "Em até 1h", sub: "Com Propoz", value: 68, highlight: true },
                { label: "Mesmo dia", sub: "Até 8h depois", value: 49, highlight: false },
                { label: "24h a 48h", sub: "Média do mercado", value: 28, highlight: false },
                { label: "+3 dias", sub: "Lead esfriou", value: 14, highlight: false },
              ].map((bar) => (
                <div key={bar.label} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span
                    className={`font-mono text-xs font-semibold ${
                      bar.highlight ? "text-brand" : "text-muted-foreground"
                    }`}
                  >
                    {bar.value}%
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        bar.highlight
                          ? "bg-gradient-to-t from-brand to-violet-500 shadow-sm"
                          : "bg-slate-200"
                      }`}
                      style={{ height: `${bar.value}%` }}
                    />
                  </div>
                  <span className="text-center text-[11px] font-medium leading-tight">
                    {bar.label}
                  </span>
                  <span className="text-center text-[10px] text-muted-foreground">
                    {bar.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const examples = [
  {
    tag: "Agência digital",
    title: "Gestão de tráfego pago para e-commerce de moda",
    tone: "Direto",
    sections: ["Diagnóstico", "Estratégia de mídia", "KPIs", "Investimento mensal"],
    excerpt:
      "Nos próximos 90 dias, nosso objetivo é reduzir o CAC em 25% e elevar o ROAS para 4x, reestruturando as campanhas de Meta Ads e Google Shopping...",
    chartTitle: "Meta de evolução de ROAS (90 dias)",
    chartBars: [
      { label: "Mês 1", pct: 45, value: "2.2x" },
      { label: "Mês 2", pct: 72, value: "3.1x" },
      { label: "Mês 3", pct: 100, value: "4.0x" },
    ],
  },
  {
    tag: "Consultoria",
    title: "Implantação de LGPD em rede de clínicas",
    tone: "Formal",
    sections: ["Contexto regulatório", "Metodologia", "Cronograma", "Condições comerciais"],
    excerpt:
      "A presente proposta tem por objeto a adequação das 6 unidades à Lei nº 13.709/2018, contemplando mapeamento de dados, políticas internas e treinamento...",
    chartTitle: "Distribuição das etapas (8 semanas)",
    chartBars: [
      { label: "Mapeamento", pct: 30, value: "2 sem" },
      { label: "Adequação jurídica", pct: 50, value: "4 sem" },
      { label: "Treinamento", pct: 20, value: "2 sem" },
    ],
  },
  {
    tag: "Software house",
    title: "App de delivery white-label para restaurantes",
    tone: "Consultivo",
    sections: ["Entendimento do desafio", "Escopo do MVP", "Roadmap", "Investimento"],
    excerpt:
      "Entendemos que o maior desafio hoje é a dependência dos marketplaces e suas taxas de até 27%. Por isso, recomendamos começar por um MVP enxuto...",
    chartTitle: "Alocação do orçamento do MVP",
    chartBars: [
      { label: "App Mobile & Web", pct: 55, value: "55%" },
      { label: "Painel + Pagamentos", pct: 30, value: "30%" },
      { label: "QA & Publicação", pct: 15, value: "15%" },
    ],
  },
];

export function Examples() {
  return (
    <section id="exemplos" className="scroll-mt-20 border-t bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Exemplos"
          title="Propostas que parecem escritas pelo seu melhor vendedor"
          description="Estruturadas, personalizadas, com gráficos automáticos de cronograma e investimento."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {examples.map((e) => (
            <article
              key={e.title}
              className="group flex flex-col rounded-2xl border bg-background p-6 shadow-xs transition-shadow hover:shadow-lg"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-md bg-brand/10 px-2 py-0.5 font-medium text-brand">{e.tag}</span>
                <span className="text-muted-foreground">Tom: {e.tone}</span>
              </div>
              <div className="mt-5 h-1 w-8 rounded-full bg-brand" />
              <h3 className="mt-3 font-semibold leading-snug">{e.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{e.excerpt}</p>

              {/* Mini gráfico visual do exemplo */}
              <div className="mt-4 rounded-xl border bg-muted/30 p-3">
                <p className="text-[11px] font-medium text-muted-foreground">{e.chartTitle}</p>
                <div className="mt-2 space-y-1.5">
                  {e.chartBars.map((b) => (
                    <div key={b.label} className="grid grid-cols-[110px_1fr_42px] items-center gap-2 text-[11px]">
                      <span className="truncate text-foreground/80">{b.label}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${b.pct}%` }} />
                      </div>
                      <span className="text-right font-mono font-medium">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 border-t pt-4">
                {e.sections.map((s) => (
                  <span key={s} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const features = [
    { icon: Sparkles, title: "IA treinada para vender", text: "Prompt especializado em propostas B2B brasileiras, com estrutura que converte." },
    { icon: PenLine, title: "Editor integrado", text: "Ajuste qualquer trecho antes de exportar. Prévia em tempo real." },
    { icon: Download, title: "PDF profissional", text: "Cabeçalho com sua logo, tabelas de investimento e rodapé com contatos." },
    { icon: Layers, title: "Seções sob medida", text: "Escopo, cronograma, investimento, metodologia, termos — você escolhe." },
    { icon: Gauge, title: "Pronto em minutos", text: "Geração com streaming: veja a proposta sendo escrita em tempo real." },
    { icon: ShieldCheck, title: "Seus dados seguros", text: "Propostas privadas, acessíveis apenas pela sua conta." },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Recursos" title="Tudo o que você precisa para fechar mais contratos" />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-background p-6">
              <f.icon className="size-5 text-brand" />
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="precos" className="scroll-mt-20 border-t bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Preços"
          title="Uma proposta fechada já paga o ano inteiro"
          description="Comece grátis. Faça upgrade quando a Propoz virar o coração do seu processo comercial."
        />
        <div className="mt-14">
          <PricingCards />
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const faqs = [
    {
      q: "A IA inventa preços e prazos?",
      a: "Não. Se o brief trouxer valores e prazos, eles são respeitados. Caso contrário, a proposta usa marcadores como “R$ [a definir]” para você completar.",
    },
    {
      q: "Posso editar a proposta antes de baixar?",
      a: "Sim. Toda proposta gerada abre em um editor com prévia em tempo real. O PDF é gerado a partir da versão editada.",
    },
    {
      q: "Como funciona o limite do plano Free?",
      a: "Você pode gerar 3 propostas por mês, renovadas automaticamente todo dia 1º. Os PDFs do plano Free têm uma marca d'água discreta.",
    },
    {
      q: "Posso cancelar o Pro quando quiser?",
      a: "Sim. A assinatura é mensal, sem fidelidade. Você cancela em um clique pelo portal de pagamentos.",
    },
    {
      q: "Quais formas de pagamento são aceitas?",
      a: "Pix (acesso de 30 dias ao Pro) e cartão de crédito (assinatura mensal) via Stripe, em reais (R$).",
    },
  ];
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Perguntas frequentes" />
        <div className="mt-12 divide-y rounded-2xl border">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-brand/40 blur-[100px]" />
        <FileSignature className="relative mx-auto size-10 text-white/80" />
        <h2 className="relative mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Sua próxima proposta pode estar pronta antes do café esfriar.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/70">
          Crie sua conta grátis e gere 3 propostas profissionais hoje mesmo.
        </p>
        <Button asChild size="lg" className="relative mt-8 bg-white text-primary hover:bg-white/90">
          <Link href="/cadastro">
            Começar grátis agora <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Logo />
        <p>© {new Date().getFullYear()} Propoz · usepropoz.com.br</p>
        <div className="flex gap-5">
          <a href="#precos" className="hover:text-foreground">
            Preços
          </a>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  );
}
