import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { User } from "@/models/User";

const DEFAULT_SUBSCRIPTION_ITEM: Stripe.Checkout.SessionCreateParams.LineItem = {
  quantity: 1,
  price_data: {
    currency: "brl",
    product_data: {
      name: "PropostaAI Pro",
      description: "Propostas comerciais ilimitadas com IA e PDF sem marca d'água",
    },
    unit_amount: 3900, // R$ 39,00
    recurring: { interval: "month" },
  },
};

const DEFAULT_PIX_ITEM: Stripe.Checkout.SessionCreateParams.LineItem = {
  quantity: 1,
  price_data: {
    currency: "brl",
    product_data: {
      name: "PropostaAI Pro — 30 dias (Pix / Cartão)",
      description: "30 dias de acesso ao Plano Pro: propostas ilimitadas e PDF sem marca d'água",
    },
    unit_amount: 3900, // R$ 39,00
  },
};

async function resolveSubscriptionLineItem(
  stripe: Stripe,
  configuredId?: string
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  const id = (configuredId ?? "").replace(/^['"]+|['"]+$/g, "").trim();

  if (id.startsWith("price_")) {
    const price = await stripe.prices.retrieve(id).catch(() => null);
    if (price && price.active && price.type === "recurring") {
      return { price: price.id, quantity: 1 };
    }
    if (price && typeof price.product === "string") {
      return {
        quantity: 1,
        price_data: {
          currency: "brl",
          product: price.product,
          unit_amount: 3900,
          recurring: { interval: "month" },
        },
      };
    }
    return DEFAULT_SUBSCRIPTION_ITEM;
  }

  if (id.startsWith("prod_")) {
    const product = await stripe.products.retrieve(id).catch(() => null);
    if (!product || !product.active) {
      return DEFAULT_SUBSCRIPTION_ITEM;
    }

    const prices = await stripe.prices
      .list({ product: id, active: true, type: "recurring", limit: 1 })
      .catch(() => null);

    if (prices?.data?.[0]?.id) {
      return { price: prices.data[0].id, quantity: 1 };
    }

    return {
      quantity: 1,
      price_data: {
        currency: "brl",
        product: product.id,
        unit_amount: 3900,
        recurring: { interval: "month" },
      },
    };
  }

  return DEFAULT_SUBSCRIPTION_ITEM;
}

async function resolveOneTimeLineItem(
  stripe: Stripe,
  configuredId?: string
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  const id = (configuredId ?? "").replace(/^['"]+|['"]+$/g, "").trim();

  if (id.startsWith("prod_")) {
    const product = await stripe.products.retrieve(id).catch(() => null);
    if (product && product.active) {
      return {
        quantity: 1,
        price_data: {
          currency: "brl",
          product: product.id,
          unit_amount: 3900,
        },
      };
    }
  }

  return DEFAULT_PIX_ITEM;
}

function getBaseUrl(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("http")) return origin.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return absoluteUrl("");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Pagamentos não configurados (STRIPE_SECRET_KEY ausente)." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const paymentMethod: "pix" | "subscription" =
    body?.paymentMethod === "pix" ? "pix" : "subscription";

  try {
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (user.plan === "pro") {
      return NextResponse.json({ error: "Você já é assinante Pro." }, { status: 400 });
    }

    const stripe = getStripe();
    let customerId = user.stripeCustomerId;
    if (customerId) {
      const existing = await stripe.customers.retrieve(customerId).catch(() => null);
      if (!existing || (existing as Stripe.DeletedCustomer).deleted) {
        customerId = undefined;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/dashboard/plano?status=sucesso&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/dashboard/plano?status=cancelado`;

    // Modo Pix (pagamento avulso de 30 dias em BRL — vai direto para o Pix no Stripe)
    if (paymentMethod === "pix") {
      const lineItem = await resolveOneTimeLineItem(stripe, process.env.STRIPE_PRO_PRICE_ID);
      try {
        const checkout = await stripe.checkout.sessions.create({
          mode: "payment",
          customer: customerId,
          client_reference_id: user._id.toString(),
          payment_method_types: ["pix"],
          payment_method_options: {
            pix: { expires_after_seconds: 3600 },
          },
          line_items: [lineItem],
          locale: "pt-BR",
          allow_promotion_codes: true,
          billing_address_collection: "auto",
          metadata: { userId: user._id.toString(), planType: "pix_30d" },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
        return NextResponse.json({ url: checkout.url });
      } catch (pixErr) {
        console.error("[stripe/checkout pix]", pixErr);
        const rawMsg = (pixErr as Error)?.message ?? "";
        return NextResponse.json(
          {
            error:
              "O Pix ainda não está ativo na sua conta Stripe. Acesse dashboard.stripe.com/settings/payment_methods e clique em 'Ativar' ao lado de Pix. (" +
              rawMsg +
              ")",
          },
          { status: 400 }
        );
      }
    }

    // Modo Assinatura Mensal (Cartão)
    const lineItem = await resolveSubscriptionLineItem(stripe, process.env.STRIPE_PRO_PRICE_ID);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user._id.toString(),
      line_items: [lineItem],
      locale: "pt-BR",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: { metadata: { userId: user._id.toString() } },
      metadata: { userId: user._id.toString() },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[stripe/checkout v3]", err);
    const detail = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Não foi possível iniciar o pagamento: ${detail}` },
      { status: 500 }
    );
  }
}
