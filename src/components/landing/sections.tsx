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
  },
  {
    tag: "Consultoria",
    title: "Implantação de LGPD em rede de clínicas",
    tone: "Formal",
    sections: ["Contexto regulatório", "Metodologia", "Cronograma", "Condições comerciais"],
    excerpt:
      "A presente proposta tem por objeto a adequação das 6 unidades à Lei nº 13.709/2018, contemplando mapeamento de dados, políticas internas e treinamento...",
  },
  {
    tag: "Software house",
    title: "App de delivery white-label para restaurantes",
    tone: "Consultivo",
    sections: ["Entendimento do desafio", "Escopo do MVP", "Roadmap", "Investimento"],
    excerpt:
      "Entendemos que o maior desafio hoje é a dependência dos marketplaces e suas taxas de até 27%. Por isso, recomendamos começar por um MVP enxuto...",
  },
];

export function Examples() {
  return (
    <section id="exemplos" className="scroll-mt-20 border-t bg-muted/30 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Exemplos"
          title="Propostas que parecem escritas pelo seu melhor vendedor"
          description="Estruturadas, personalizadas e no tom certo para cada cliente."
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
              <div className="mt-5 flex flex-wrap gap-1.5 border-t pt-4">
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
          description="Comece grátis. Faça upgrade quando a PropostaAI virar parte do seu processo comercial."
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
      a: "Cartão de crédito via Stripe, com cobrança recorrente em reais (R$).",
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
        <p>© {new Date().getFullYear()} PropostaAI. Feito no Brasil.</p>
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
