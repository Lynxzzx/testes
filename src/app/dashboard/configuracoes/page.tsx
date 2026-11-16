import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { toCompanyValues } from "@/lib/company";
import { getCurrentUser } from "@/lib/current-user";
import type { Tone } from "@/lib/plans";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Configurações"
        description="Configure os dados padrão da sua empresa, logo e preferências de escrita."
      />
      <SettingsForm
        initialName={user.name || ""}
        email={user.email}
        initialCompany={toCompanyValues(user.company)}
        initialLogo={user.company?.logo ?? ""}
        initialTone={(user.preferences?.tone as Tone) ?? "consultivo"}
      />
    </div>
  );
}
