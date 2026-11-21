import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href="#como-funciona"
            className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur hover:text-foreground"
          >
            <Sparkles className="size-3.5 text-brand" />
            Propostas geradas por IA, em português
            <ArrowRight className="size-3" />
          </a>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Do brief à proposta comercial em PDF em{" "}
            <span className="bg-gradient-to-r from-brand to-violet-500 bg-clip-text text-transparent">2 minutos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Cole o brief do cliente e os dados da sua empresa. A Propoz escreve uma proposta completa, com escopo,
            cronograma, investimento, link interativo com assinatura digital e CRM integrado.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="brand" className="w-full sm:w-auto">
              <Link href="/cadastro">
                Criar minha primeira proposta <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <a href="#exemplos">Ver exemplos</a>
            </Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> 3 propostas grátis por mês
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Sem cartão de crédito
            </span>
          </p>
        </div>

        <HeroDemo />
      </div>
    </section>
  );
}

function HeroDemo() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="rounded-2xl border bg-background/80 p-2 shadow-2xl shadow-brand/10 backdrop-blur">
        <div className="flex items-center gap-1.5 border-b px-3 pb-2 pt-1">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs text-muted-foreground">usepropoz.com.br/dashboard/propostas/nova</span>
        </div>
        <div className="grid gap-2 p-2 md:grid-cols-2">
          {/* Entrada */}
          <div className="rounded-xl border bg-muted/40 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Brief do cliente</p>
            <div className="mt-3 rounded-lg border bg-background p-4 text-sm leading-relaxed text-muted-foreground">
              &ldquo;Somos uma rede de 4 clínicas odontológicas em Curitiba. Queremos um site novo com agendamento online,
              integração com WhatsApp e SEO local. Orçamento até R$ 18 mil, lançamento em 2 meses.&rdquo;
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sua empresa</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-background px-3 py-2">Pixel Studio Ltda.</div>
              <div className="rounded-lg border bg-background px-3 py-2">12.345.678/0001-90</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Consultivo", "Escopo", "Cronograma", "Investimento"].map((t, i) => (
                <span
                  key={t}
                  className={
                    i === 0
                      ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-md border bg-background px-2.5 py-1 text-xs"
                  }
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex h-10 items-center justify-center gap-2 rounded-md bg-brand text-sm font-medium text-white">
              <Sparkles className="size-4" /> Gerar proposta
            </div>
          </div>

          {/* Saída */}
          <div className="relative rounded-xl border bg-background p-6">
            <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700">
              <FileText className="size-3" /> PDF pronto
            </div>
            <div className="mb-3 h-1 w-10 rounded-full bg-brand" />
            <h3 className="pr-24 text-lg font-semibold leading-tight">
              Proposta: Novo site com agendamento online — Rede Sorriso
            </h3>
            <p className="mt-1 text-xs italic text-muted-foreground">Preparada para: Rede Sorriso · 15 de novembro</p>
            <h4 className="mt-5 border-b pb-1 text-sm font-semibold">1. Resumo executivo</h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Propomos um site institucional de alta conversão para as 4 unidades, com agendamento integrado ao WhatsApp e
              estratégia de SEO local para dominar as buscas em Curitiba.
            </p>
            <h4 className="mt-4 border-b pb-1 text-sm font-semibold">2. Investimento</h4>
            <div className="mt-2 overflow-hidden rounded-md border text-xs">
              {[
                ["Design e desenvolvimento", "R$ 11.500"],
                ["Agendamento + WhatsApp", "R$ 3.800"],
                ["SEO local (4 unidades)", "R$ 2.400"],
              ].map(([a, b], i) => (
                <div key={a} className={`flex justify-between px-3 py-1.5 ${i % 2 ? "bg-muted/50" : ""}`}>
                  <span>{a}</span>
                  <span className="font-medium">{b}</span>
                </div>
              ))}
              <div className="flex justify-between border-t bg-muted px-3 py-1.5 font-semibold">
                <span>Total</span>
                <span>R$ 17.700</span>
              </div>
            </div>
            {/* Mini gráfico visual de distribuição na demonstração */}
            <div className="mt-3 rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Distribuição do orçamento</span>
                <span className="font-mono font-medium text-foreground">100%</span>
              </div>
              <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
                <div className="bg-brand" style={{ width: "65%" }} />
                <div className="bg-violet-500" style={{ width: "21%" }} />
                <div className="bg-sky-500" style={{ width: "14%" }} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-brand" /> Site 65%
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-violet-500" /> WhatsApp 21%
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-sky-500" /> SEO 14%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
