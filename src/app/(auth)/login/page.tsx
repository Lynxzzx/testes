import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const safeCallback = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";
  return (
    <AuthForm
      mode="login"
      googleEnabled={!!process.env.GOOGLE_CLIENT_ID}
      callbackUrl={safeCallback}
      initialError={error}
    />
  );
}
