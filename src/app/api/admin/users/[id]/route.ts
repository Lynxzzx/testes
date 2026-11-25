import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { currentPeriod } from "@/lib/plans";
import { Activity } from "@/models/Activity";
import { Client } from "@/models/Client";
import { Proposal } from "@/models/Proposal";
import { User } from "@/models/User";

const updateAdminUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido").optional(),
  companyName: z.string().trim().max(160).optional(),
  plan: z.enum(["free", "pro"]).optional(),
  proDurationDays: z.number().min(1).max(36500).optional(),
  isAdmin: z.boolean().optional(),
  newPassword: z
    .string()
    .min(6, "A nova senha deve ter no mínimo 6 caracteres")
    .max(100)
    .optional(),
  resetMonthlyUsage: z.boolean().optional(),
  usageCount: z.number().min(0).max(10000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminApiUser();
  if (!admin) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "ID de usuário inválido." }, { status: 400 });
  }

  const parsed = updateAdminUserSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  await connectDB();
  const target = await User.findById(id);
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const data = parsed.data;

  // Se estiver alterando e-mail, verifica duplicidade
  if (data.email && data.email !== target.email) {
    const duplicate = await User.findOne({
      email: data.email,
      _id: { $ne: target._id },
    }).lean();
    if (duplicate) {
      return NextResponse.json(
        { error: "Já existe outra conta usando este e-mail." },
        { status: 409 }
      );
    }
    target.email = data.email;
  }

  if (data.name !== undefined) target.name = data.name;
  if (data.companyName !== undefined) {
    target.set("company.name", data.companyName);
  }
  if (data.isAdmin !== undefined) {
    // Impede que o próprio admin logado remova seu próprio acesso de admin por engano
    if (target._id.toString() === admin._id.toString() && data.isAdmin === false) {
      return NextResponse.json(
        { error: "Você não pode remover sua própria permissão de Administrador." },
        { status: 400 }
      );
    }
    target.isAdmin = data.isAdmin;
  }

  // Gerenciamento de plano (Free <-> Pro + Validade)
  if (data.plan !== undefined) {
    target.plan = data.plan;
    if (data.plan === "pro") {
      const days = data.proDurationDays ?? 365;
      target.subscriptionStatus = "active";
      target.currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      target.subscriptionStatus = "";
      target.currentPeriodEnd = undefined;
    }
  } else if (data.proDurationDays !== undefined && target.plan === "pro") {
    target.currentPeriodEnd = new Date(
      Date.now() + data.proDurationDays * 24 * 60 * 60 * 1000
    );
  }

  // Troca de senha pelo administrador
  if (data.newPassword) {
    target.passwordHash = await bcrypt.hash(data.newPassword, 12);
  }

  // Reset ou ajuste do contador mensal de propostas
  if (data.resetMonthlyUsage) {
    target.usage = { period: currentPeriod(), count: 0 };
  } else if (data.usageCount !== undefined) {
    target.usage = { period: currentPeriod(), count: data.usageCount };
  }

  await target.save();

  const period = currentPeriod();
  const usedThisMonth =
    target.usage?.period === period ? target.usage?.count ?? 0 : 0;

  return NextResponse.json({
    ok: true,
    user: {
      id: target._id.toString(),
      name: target.name,
      email: target.email,
      plan: target.plan,
      isAdmin: Boolean(target.isAdmin),
      companyName: target.company?.name || "",
      subscriptionStatus: target.subscriptionStatus || "",
      currentPeriodEnd: target.currentPeriodEnd
        ? target.currentPeriodEnd.toISOString()
        : null,
      usedThisMonth,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminApiUser();
  if (!admin) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  if (id === admin._id.toString()) {
    return NextResponse.json(
      { error: "Você não pode excluir sua própria conta de Administrador." },
      { status: 400 }
    );
  }

  await connectDB();
  await Promise.all([
    User.deleteOne({ _id: id }),
    Proposal.deleteMany({ user: id }),
    Client.deleteMany({ user: id }),
    Activity.deleteMany({ user: id }),
  ]);

  return NextResponse.json({ ok: true });
}
