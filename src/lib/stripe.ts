import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      appInfo: { name: "PropostaAI" },
    });
  }
  return _stripe;
}

/** Compatível com versões da API em que o período fica no item da assinatura. */
export function getPeriodEnd(sub: Stripe.Subscription): Date | undefined {
  const raw =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  return raw ? new Date(raw * 1000) : undefined;
}

export const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];
