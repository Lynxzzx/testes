import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { User } from "@/models/User";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 500 });

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
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user._id.toString(),
      line_items: [{ price: priceId, quantity: 1 }],
      locale: "pt-BR",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: { metadata: { userId: user._id.toString() } },
      metadata: { userId: user._id.toString() },
      success_url: absoluteUrl("/dashboard/plano?status=sucesso"),
      cancel_url: absoluteUrl("/dashboard/plano?status=cancelado"),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
