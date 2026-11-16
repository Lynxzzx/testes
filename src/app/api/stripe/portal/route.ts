import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { User } from "@/models/User";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "Nenhuma assinatura encontrada." }, { status: 400 });
  }

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: absoluteUrl("/dashboard/plano"),
      locale: "pt-BR",
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "Não foi possível abrir o portal." }, { status: 500 });
  }
}
