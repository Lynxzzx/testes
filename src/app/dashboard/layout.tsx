import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SupportWidget } from "@/components/dashboard/support-widget";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { UserMenu } from "@/components/dashboard/user-menu";
import { isUserAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/current-user";
import { getUsage } from "@/lib/usage";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user.onboarded) redirect("/onboarding");
  const usage = getUsage(user);
  const admin = isUserAdmin(user);

  return (
    <div className="min-h-dvh bg-muted/30 lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-background p-3 lg:flex">
        <div className="px-2 py-2">
          <Logo href="/dashboard" />
        </div>
        <div className="mt-6 flex-1">
          <SidebarNav isAdmin={admin} />
        </div>
        <UsageMeter plan={usage.plan} used={usage.used} limit={usage.limit} className="mb-3" />
        <UserMenu name={user.name} email={user.email} image={user.image ?? undefined} />
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo href="/dashboard" />
          <div className="w-44">
            <UserMenu name={user.name} email={user.email} image={user.image ?? undefined} />
          </div>
        </div>
        <div className="px-3 pb-2">
          <SidebarNav orientation="horizontal" isAdmin={admin} />
        </div>
      </header>

      <main className="min-w-0 pb-14">{children}</main>
      <SupportWidget userEmail={user.email} />
    </div>
  );
}
