import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { NewProposalForm } from "@/components/proposal/new-proposal-form";
import { toCompanyValues } from "@/lib/company";
import { getCurrentUser } from "@/lib/current-user";
import type { Tone } from "@/lib/plans";
import { getUsage } from "@/lib/usage";

export const metadata: Metadata = { title: "Nova proposta" };

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ clientName?: string }>;
}) {
  const { clientName = "" } = await searchParams;
  const user = await getCurrentUser();
  const usage = getUsage(user);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Nova proposta"
        description="Cole o brief, revise os dados da sua empresa e deixe a IA escrever a proposta."
      />
      <NewProposalForm
        defaultClientName={clientName}
        defaultCompany={toCompanyValues(user.company)}
        defaultTone={(user.preferences?.tone as Tone) ?? "consultivo"}
        usage={{ plan: usage.plan, remaining: usage.remaining, canGenerate: usage.canGenerate }}
      />
    </div>
  );
}
