"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, Kanban, Plus, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Propostas", icon: FileText, exact: true },
  { href: "/dashboard/crm", label: "CRM & Funil", icon: Kanban },
  { href: "/dashboard/propostas/nova", label: "Nova proposta", icon: Plus },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  { href: "/dashboard/plano", label: "Plano e cobrança", icon: CreditCard },
];

export function SidebarNav({
  orientation = "vertical",
  isAdmin = false,
}: {
  orientation?: "vertical" | "horizontal";
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV, { href: "/dashboard/admin", label: "Painel Admin", icon: ShieldCheck }]
    : NAV;

  const isActive = (href: string, exact?: boolean) => {
    if (!exact) return pathname.startsWith(href);
    // "Propostas" também fica ativo ao visualizar uma proposta (mas não em "Nova")
    return (
      pathname === href ||
      (pathname.startsWith("/dashboard/propostas/") && pathname !== "/dashboard/propostas/nova")
    );
  };

  return (
    <nav className={cn(orientation === "vertical" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto")}>
      {items.map((item) => {
        const active = isActive(item.href, item.exact);
        const isAdminLink = item.href === "/dashboard/admin";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-accent font-medium text-foreground",
              isAdminLink && !active && "text-brand hover:text-brand"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
