import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/onboarding-form";
import { toCompanyValues } from "@/lib/company";
import { getCurrentUser } from "@/lib/current-user";
import type { Tone } from "@/lib/plans";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextUrl = next?.startsWith("/") ? next : "/dashboard";
  const user = await getCurrentUser();
  if (user.onboarded) redirect(nextUrl);

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Logo href="/dashboard" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <OnboardingForm
          firstName={(user.name || "").split(" ")[0]}
          initialCompany={toCompanyValues(user.company)}
          initialLogo={user.company?.logo ?? ""}
          initialTone={(user.preferences?.tone as Tone) ?? "consultivo"}
          nextUrl={nextUrl}
        />
      </main>
    </div>
  );
}
