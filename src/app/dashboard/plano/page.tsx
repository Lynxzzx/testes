import type { Metadata } from "next";
import { CheckCircle2, Info } from "lucide-react";
import { CheckoutButton, PortalButton } from "@/components/billing/billing-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PricingCards } from "@/components/pricing-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user";
import { getUsage } from "@/lib/usage";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Plano e cobrança" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getCurrentUser();
  const usage = getUsage(user);
  const isPro = usage.plan === "pro";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Plano e cobrança"
        description="Gerencie sua assinatura e acompanhe o consumo mensal de propostas."
      />

      {status === "sucesso" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          Assinatura confirmada! Seu plano Pro já está ativo.
        </div>
      )}
      {status === "cancelado" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          O checkout foi cancelado. Nenhuma cobrança foi realizada.
        </div>
      )}

      {/* Resumo do plano atual */}
      <div className="mt-8 flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Plano atual:</span>
            <Badge variant={isPro ? "brand" : "secondary"}>{isPro ? "Pro" : "Free"}</Badge>
          </div>
          <p className="mt-2 text-lg font-semibold">
            {isPro
              ? `Propostas ilimitadas · ${usage.used} gerada(s) este mês`
              : `${usage.used} de ${usage.limit} propostas usadas este mês`}
          </p>
          {isPro && user.currentPeriodEnd && (
            <p className="mt-1 text-xs text-muted-foreground">
              Próxima renovação em {formatDate(user.currentPeriodEnd)}
            </p>
          )}
        </div>
        {isPro && user.stripeCustomerId ? (
          <div className="sm:w-64">
            <PortalButton />
          </div>
        ) : null}
      </div>

      {/* Comparativo de planos */}
      <div className="mt-10">
        <PricingCards
          freeCta={
            <Button variant="outline" size="lg" className="w-full" disabled>
              {isPro ? "Plano básico" : "Seu plano atual"}
            </Button>
          }
          proCta={
            isPro ? (
              user.stripeCustomerId ? (
                <PortalButton />
              ) : (
                <Button variant="brand" size="lg" className="w-full" disabled>
                  Plano ativo
                </Button>
              )
            ) : (
              <CheckoutButton className="w-full" />
            )
          }
        />
      </div>
    </div>
  );
}
