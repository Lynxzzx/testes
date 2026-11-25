import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { currentPeriod } from "@/lib/plans";
import { User } from "@/models/User";

const createAdminUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(100),
  plan: z.enum(["free", "pro"]).default("free"),
  proDurationDays: z.number().min(1).max(3650).optional().default(30),
  isAdmin: z.boolean().optional().default(false),
  companyName: z.string().trim().max(160).optional().default(""),
});

export async function POST(req: Request) {
  const admin = await getAdminApiUser();
  if (!admin) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const parsed = createAdminUserSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { name, email, password, plan, proDurationDays, isAdmin, companyName } = parsed.data;

  await connectDB();
  const exists = await User.findOne({ email }).lean();
  if (exists) {
    return NextResponse.json(
      { error: "Já existe um usuário com este e-mail." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const periodEnd =
    plan === "pro"
      ? new Date(Date.now() + proDurationDays * 24 * 60 * 60 * 1000)
      : undefined;

  const created = await User.create({
    name,
    email,
    passwordHash,
    provider: "credentials",
    onboarded: true,
    isAdmin,
    plan,
    subscriptionStatus: plan === "pro" ? "active" : "",
    currentPeriodEnd: periodEnd,
    usage: { period: currentPeriod(), count: 0 },
    company: { name: companyName || name },
  });

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: created._id.toString(),
        name: created.name,
        email: created.email,
        plan: created.plan,
        isAdmin: created.isAdmin,
        provider: created.provider,
        companyName: created.company?.name || "",
        subscriptionStatus: created.subscriptionStatus || "",
        currentPeriodEnd: created.currentPeriodEnd
          ? created.currentPeriodEnd.toISOString()
          : null,
        usedThisMonth: 0,
        totalProposals: 0,
        createdAt: (created as unknown as { createdAt: Date }).createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
