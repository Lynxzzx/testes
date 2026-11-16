import { connectDB } from "@/lib/db";
import { PLANS, currentPeriod, type PlanId } from "@/lib/plans";
import { User, type UserDoc } from "@/models/User";

export function getPlan(user: Pick<UserDoc, "plan">) {
  return PLANS[(user.plan as PlanId) ?? "free"] ?? PLANS.free;
}

/** Quantidade de propostas usadas no mês corrente. */
export function usedThisMonth(user: Pick<UserDoc, "usage">) {
  return user.usage?.period === currentPeriod() ? user.usage.count ?? 0 : 0;
}

export function getUsage(user: Pick<UserDoc, "plan" | "usage">) {
  const plan = getPlan(user);
  const used = usedThisMonth(user);
  const limit = plan.monthlyLimit;
  return {
    plan: plan.id,
    used,
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
    canGenerate: used < limit,
  };
}

/**
 * Consome 1 crédito de forma atômica. Retorna false se o limite foi atingido.
 * Usa update condicional para evitar condições de corrida entre requisições.
 */
export async function consumeCredit(userId: string): Promise<boolean> {
  await connectDB();
  const period = currentPeriod();
  const user = await User.findById(userId).lean();
  if (!user) return false;
  const plan = getPlan(user);

  if (!Number.isFinite(plan.monthlyLimit)) {
    await User.updateOne(
      { _id: userId },
      user.usage?.period === period
        ? { $inc: { "usage.count": 1 } }
        : { $set: { usage: { period, count: 1 } } }
    );
    return true;
  }

  // Novo mês: reinicia o contador
  if (user.usage?.period !== period) {
    const res = await User.updateOne(
      { _id: userId, "usage.period": { $ne: period } },
      { $set: { usage: { period, count: 1 } } }
    );
    if (res.modifiedCount === 1) return true;
  }

  const res = await User.updateOne(
    { _id: userId, "usage.period": period, "usage.count": { $lt: plan.monthlyLimit } },
    { $inc: { "usage.count": 1 } }
  );
  return res.modifiedCount === 1;
}

/** Devolve o crédito caso a geração falhe. */
export async function refundCredit(userId: string) {
  await connectDB();
  await User.updateOne(
    { _id: userId, "usage.period": currentPeriod(), "usage.count": { $gt: 0 } },
    { $inc: { "usage.count": -1 } }
  );
}
