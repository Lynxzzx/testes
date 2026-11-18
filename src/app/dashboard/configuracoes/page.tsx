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
        description="Configure o logotipo, cor da sua marca, dados padrão da empresa e preferências de escrita."
      />
      <SettingsForm
        initialName={user.name || ""}
        email={user.email}
        initialCompany={toCompanyValues(user.company)}
        initialLogo={user.company?.logo ?? ""}
        initialBrandColor={user.company?.brandColor || "#4f46e5"}
        initialTone={(user.preferences?.tone as Tone) ?? "consultivo"}
      />
    </div>
  );
}
