import type { Metadata } from "next";
import { CheckCircle2, Info } from "lucide-react";
import { CheckoutButton, PortalButton } from "@/components/billing/billing-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { PricingCards } from "@/components/pricing-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user";
import { ACTIVE_STATUSES, getPeriodEnd, getStripe } from "@/lib/stripe";
import { getUsage } from "@/lib/usage";
import { formatDate } from "@/lib/utils";
import { User } from "@/models/User";

export const metadata: Metadata = { title: "Plano e cobrança" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>;
}) {
  const { status, session_id } = await searchParams;
  let user = await getCurrentUser();

  // Sincronização imediata ao retornar do checkout (Pix avulso ou Assinatura no Cartão)
  if (status === "sucesso" && user.plan !== "pro" && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripe();
      if (session_id) {
        const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
        const ownerId =
          checkoutSession.metadata?.userId || checkoutSession.client_reference_id;
        if (
          ownerId === user._id.toString() &&
          checkoutSession.payment_status === "paid"
        ) {
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                plan: "pro",
                subscriptionStatus: "active",
                currentPeriodEnd: periodEnd,
              },
            }
          );
          user = { ...user, plan: "pro", currentPeriodEnd: periodEnd };
        }
      }

      if (user.plan !== "pro" && user.stripeCustomerId) {
        const subs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "all",
          limit: 1,
        });
        const sub = subs.data[0];
        if (sub && ACTIVE_STATUSES.includes(sub.status)) {
          const periodEnd = getPeriodEnd(sub);
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                plan: "pro",
                stripeSubscriptionId: sub.id,
                subscriptionStatus: sub.status,
                currentPeriodEnd: periodEnd,
              },
            }
          );
          user = { ...user, plan: "pro", currentPeriodEnd: periodEnd };
        }
      }
    } catch (err) {
      console.warn("[plano] falha ao sincronizar pagamento no retorno:", err);
    }
  }

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
          Pagamento confirmado! Seu plano Pro já está ativo.
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
              Válido até {formatDate(user.currentPeriodEnd)}
            </p>
          )}
        </div>
        {isPro && user.stripeSubscriptionId && user.stripeCustomerId ? (
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
              user.stripeSubscriptionId && user.stripeCustomerId ? (
                <PortalButton />
              ) : (
                <Button variant="brand" size="lg" className="w-full" disabled>
                  Plano Pro ativo
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
