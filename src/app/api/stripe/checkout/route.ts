import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { User } from "@/models/User";

/**
 * Resolve o item de cobrança do Stripe aceitando tanto um Price ID (`price_...`)
 * quanto um Product ID (`prod_...`), ou criando `price_data` recorrente de R$ 39/mês.
 */
async function resolveLineItem(
  stripe: Stripe,
  configuredId?: string
): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  const id = configuredId?.trim() ?? "";

  if (id.startsWith("price_")) {
    return { price: id, quantity: 1 };
  }

  if (id.startsWith("prod_")) {
    // Tenta localizar um preço recorrente ativo já cadastrado nesse produto
    const prices = await stripe.prices
      .list({ product: id, active: true, type: "recurring", limit: 1 })
      .catch(() => null);

    if (prices?.data?.[0]?.id) {
      return { price: prices.data[0].id, quantity: 1 };
    }

    // Se o produto não tiver preço recorrente ou tiver apenas preço avulso, usa price_data
    return {
      quantity: 1,
      price_data: {
        currency: "brl",
        product: id,
        unit_amount: 3900, // R$ 39,00
        recurring: { interval: "month" },
      },
    };
  }

  return {
    quantity: 1,
    price_data: {
      currency: "brl",
      product_data: {
        name: "PropostaAI Pro",
        description: "Propostas comerciais ilimitadas com IA e PDF sem marca d'água",
      },
      unit_amount: 3900,
      recurring: { interval: "month" },
    },
  };
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
    return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 500 });
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (user.plan === "pro") {
      return NextResponse.json({ error: "Você já é assinante Pro." }, { status: 400 });
    }

    const stripe = getStripe();
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    } else {
      // Verifica se o customer ainda existe na conta/ambiente Stripe atual (test vs live)
      const existing = await stripe.customers.retrieve(customerId).catch(() => null);
      if (!existing || (existing as Stripe.DeletedCustomer).deleted) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: { userId: user._id.toString() },
        });
        customerId = customer.id;
        user.stripeCustomerId = customerId;
        await user.save();
      }
    }

    const lineItem = await resolveLineItem(stripe, process.env.STRIPE_PRO_PRICE_ID);

    const baseUrl = getBaseUrl(req);
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
      success_url: `${baseUrl}/dashboard/plano?status=sucesso`,
      cancel_url: `${baseUrl}/dashboard/plano?status=cancelado`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
