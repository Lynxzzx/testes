import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User, type UserDoc } from "@/models/User";

export const DEFAULT_ADMIN_EMAILS = ["eliezerzsantos2525@gmail.com"];

export function isUserAdmin(
  user?: { isAdmin?: boolean | null; email?: string | null; name?: string | null } | null
): boolean {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const email = (user.email ?? "").toLowerCase().trim();
  if (DEFAULT_ADMIN_EMAILS.includes(email)) return true;
  return false;
}

/**
 * Valida se o usuário logado é administrador (para Server Components).
 * Redireciona para `/dashboard` caso não seja admin.
 */
export async function requireAdminPage(): Promise<UserDoc> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/login");

  if (!isUserAdmin(user)) {
    redirect("/dashboard");
  }

  // Garante que a flag isAdmin esteja persistida no banco caso seja o admin principal
  if (!user.isAdmin) {
    await User.updateOne({ _id: user._id }, { $set: { isAdmin: true } }).catch(() => {});
  }

  return user as UserDoc;
}

/**
 * Valida se a requisição de API vem de um administrador.
 */
export async function getAdminApiUser(): Promise<UserDoc | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user || !isUserAdmin(user)) return null;

  return user as UserDoc;
}
