import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUsage } from "@/lib/usage";
import { updateUserSchema } from "@/lib/validations";
import { User } from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    email: user.email,
    plan: user.plan,
    company: user.company,
    preferences: user.preferences,
    usage: getUsage(user),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = updateUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { name, company, logo, tone, onboarded } = parsed.data;

  const set: Record<string, unknown> = {};
  if (name !== undefined) set.name = name;
  if (tone !== undefined) set["preferences.tone"] = tone;
  if (onboarded !== undefined) set.onboarded = onboarded;
  if (logo !== undefined) set["company.logo"] = logo;
  if (company) {
    for (const [key, value] of Object.entries(company)) {
      if (value !== undefined) set[`company.${key}`] = value;
    }
  }

  await connectDB();
  await User.updateOne({ _id: session.user.id }, { $set: set });
  return NextResponse.json({ ok: true });
}
