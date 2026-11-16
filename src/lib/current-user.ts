import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

/** Carrega o usuário logado do MongoDB (Server Components). */
export async function getCurrentUser() {
  const sessionUser = await requireUser();
  await connectDB();
  const user = await User.findById(sessionUser.id).lean();
  if (!user) redirect("/login");
  return user;
}
