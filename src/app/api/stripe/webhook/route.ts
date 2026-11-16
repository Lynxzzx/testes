import type Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { ACTIVE_STATUSES, getPeriodEnd, getStripe } from "@/lib/stripe";
import { User } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const isActive = ACTIVE_STATUSES.includes(sub.status);
  const userId = sub.metadata?.userId;

  await connectDB();
  const filter = userId ? { _id: userId } : { stripeCustomerId: customerId };
  await User.updateOne(filter, {
    $set: {
      plan: isActive ? "pro" : "free",
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: getPeriodEnd(sub),
    },
  });
}

async function activateOneTimePro(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const userId = session.metadata?.userId || session.client_reference_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!userId && !customerId) return;

  await connectDB();
  const filter = userId ? { _id: userId } : { stripeCustomerId: customerId };
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await User.updateOne(filter, {
    $set: {
      plan: "pro",
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      subscriptionStatus: "active",
      currentPeriodEnd: periodEnd,
    },
  });
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Webhook não configurado", { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[stripe/webhook] assinatura inválida", err);
    return new Response("Assinatura inválida", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          if (!sub.metadata?.userId && session.client_reference_id) {
            sub.metadata = { ...sub.metadata, userId: session.client_reference_id };
          }
          await syncSubscription(sub);
        } else if (session.mode === "payment") {
          await activateOneTimePro(session);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] erro ao processar ${event.type}`, err);
    return new Response("Erro ao processar evento", { status: 500 });
  }

  return Response.json({ received: true });
}
