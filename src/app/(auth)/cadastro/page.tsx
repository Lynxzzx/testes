import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const { plano } = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const callbackUrl = plano === "pro" ? "/onboarding?next=/dashboard/plano" : "/onboarding";
  return <AuthForm mode="register" googleEnabled={!!process.env.GOOGLE_CLIENT_ID} callbackUrl={callbackUrl} />;
}
