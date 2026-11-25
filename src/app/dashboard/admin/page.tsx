import type { Metadata } from "next";
import { AdminUsersPanel, type AdminUserRow } from "@/components/admin/admin-users-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { isUserAdmin, requireAdminPage } from "@/lib/admin";
import { currentPeriod } from "@/lib/plans";
import { Client } from "@/models/Client";
import { Proposal } from "@/models/Proposal";
import { User } from "@/models/User";

export const metadata: Metadata = { title: "Painel do Administrador" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();
  const period = currentPeriod();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [rawUsers, proposalCountsByUser, totalProposals, proposalsThisMonth, totalCrmClients] =
    await Promise.all([
      User.find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Proposal.aggregate<{ _id: unknown; count: number }>([
        { $group: { _id: "$user", count: { $sum: 1 } } },
      ]),
      Proposal.countDocuments({}),
      Proposal.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Client.countDocuments({}),
    ]);

  const countMap = new Map<string, number>();
  for (const row of proposalCountsByUser) {
    if (row._id) countMap.set(String(row._id), row.count);
  }

  const users: AdminUserRow[] = rawUsers.map((u) => {
    const id = u._id.toString();
    const usedThisMonth = u.usage?.period === period ? u.usage?.count ?? 0 : 0;
    const createdAtDate = (u as unknown as { createdAt?: Date }).createdAt ?? new Date();

    return {
      id,
      name: u.name || "",
      email: u.email,
      plan: (u.plan as "free" | "pro") ?? "free",
      isAdmin: isUserAdmin(u),
      provider: u.provider ?? "credentials",
      companyName: u.company?.name || "",
      subscriptionStatus: u.subscriptionStatus || "",
      currentPeriodEnd: u.currentPeriodEnd ? u.currentPeriodEnd.toISOString() : null,
      usedThisMonth,
      totalProposals: countMap.get(id) ?? 0,
      createdAt: createdAtDate.toISOString(),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Painel do Administrador"
        description="Gerencie todos os usuários do Propoz, altere planos (Free / Pro), redefina senhas e acompanhe o uso da plataforma."
      />

      <div className="mt-6">
        <AdminUsersPanel
          initialUsers={users}
          currentAdminId={admin._id.toString()}
          platformStats={{
            totalProposals,
            proposalsThisMonth,
            totalCrmClients,
          }}
        />
      </div>
    </div>
  );
}
