"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Crown,
  FileText,
  KeyRound,
  Loader2,
  PencilLine,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrl } from "@/lib/proposal-charts";
import { cn, formatDate } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro";
  isAdmin: boolean;
  provider: string;
  companyName: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  usedThisMonth: number;
  totalProposals: number;
  createdAt: string;
};

type PlanFilter = "all" | "pro" | "free" | "admin";

export function AdminUsersPanel({
  initialUsers,
  currentAdminId,
  platformStats,
}: {
  initialUsers: AdminUserRow[];
  currentAdminId: string;
  platformStats: {
    totalProposals: number;
    proposalsThisMonth: number;
    totalCrmClients: number;
  };
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PlanFilter>("all");

  // Modal de edição completa do usuário (Plano, Nome, Email, Empresa, Admin, Créditos)
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  // Modal rápido de troca de senha
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Modal de criar novo usuário
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Loading de ação rápida por linha
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "pro" && u.plan !== "pro") return false;
      if (filter === "free" && u.plan !== "free") return false;
      if (filter === "admin" && !u.isAdmin) return false;
      if (q) {
        const hay = `${u.name} ${u.email} ${u.companyName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, filter]);

  const metrics = useMemo(() => {
    const total = users.length;
    const proCount = users.filter((u) => u.plan === "pro").length;
    const freeCount = total - proCount;
    const estimatedMrr = proCount * 39;
    return { total, proCount, freeCount, estimatedMrr };
  }, [users]);

  async function quickTogglePlan(user: AdminUserRow) {
    const nextPlan: "free" | "pro" = user.plan === "pro" ? "free" : "pro";
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: nextPlan,
          proDurationDays: 365,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao alterar plano.");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...data.user } : u))
      );
      toast.success(
        `Plano de ${user.name || user.email} alterado para ${nextPlan.toUpperCase()}!`
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function quickResetUsage(user: AdminUserRow) {
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetMonthlyUsage: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao zerar uso.");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, usedThisMonth: 0 } : u))
      );
      toast.success(`Uso mensal de ${user.name || user.email} zerado!`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (newPassword.trim().length < 6) {
      return toast.error("A senha deve ter no mínimo 6 caracteres.");
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao trocar senha.");
      toast.success(
        `Senha de ${passwordModalUser.name || passwordModalUser.email} alterada com sucesso!`
      );
      setPasswordModalUser(null);
      setNewPassword("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteUser(user: AdminUserRow) {
    if (user.id === currentAdminId) {
      return toast.error("Você não pode excluir sua própria conta de Administrador.");
    }
    if (
      !confirm(
        `Tem certeza que deseja excluir o usuário "${user.name || user.email}" e todas as propostas dele? Esta ação é irreversível.`
      )
    ) {
      return;
    }
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao excluir usuário.");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("Usuário excluído com sucesso.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Cards de Métricas Globais da Plataforma */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-background p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Total de Usuários</span>
            <Users className="size-4 text-brand" />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold">{metrics.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.proCount} Pro · {metrics.freeCount} Free
          </p>
        </div>

        <div className="rounded-xl border border-brand/25 bg-brand/[0.03] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-brand">
            <span className="font-medium uppercase tracking-wider">Assinantes Pro & MRR</span>
            <Crown className="size-4 text-brand" />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold text-foreground">
            {formatBrl(metrics.estimatedMrr)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.proCount} conta(s) com Plano Pro ativo
          </p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Propostas Geradas</span>
            <FileText className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold">
            {platformStats.totalProposals}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {platformStats.proposalsThisMonth} gerada(s) neste mês
          </p>
        </div>

        <div className="rounded-xl border bg-background p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Clientes no CRM</span>
            <TrendingUp className="size-4 text-violet-600" />
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold">
            {platformStats.totalCrmClients}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastrados em toda a plataforma
          </p>
        </div>
      </div>

      {/* 2. Barra de Filtros, Busca e Botão de Criar Usuário */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex flex-wrap rounded-lg border bg-background p-1">
          {[
            { id: "all" as const, label: `Todos (${users.length})` },
            { id: "pro" as const, label: `Plano Pro (${metrics.proCount})` },
            { id: "free" as const, label: `Plano Free (${metrics.freeCount})` },
            {
              id: "admin" as const,
              label: `Admins (${users.filter((u) => u.isAdmin).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                filter === tab.id && "bg-accent text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-72 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou empresa..."
              className="h-9 bg-background pl-9 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <UserPlus className="size-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* 3. Tabela Completa de Usuários */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
        <div className="hidden grid-cols-[1.5fr_1fr_150px_130px_110px_220px] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
          <span>Usuário & E-mail</span>
          <span>Empresa</span>
          <span>Plano & Validade</span>
          <span>Uso (Mês / Total)</span>
          <span>Cadastro</span>
          <span className="text-right">Ações do Administrador</span>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado com este filtro.
          </p>
        ) : (
          <ul className="divide-y">
            {filteredUsers.map((user) => {
              const isPro = user.plan === "pro";
              const isBusy = busyUserId === user.id;

              return (
                <li
                  key={user.id}
                  className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/25 lg:grid-cols-[1.5fr_1fr_150px_130px_110px_220px] lg:gap-4"
                >
                  {/* Nome e Email */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {user.name || "Sem nome"}
                      </span>
                      {user.isAdmin && (
                        <Badge variant="brand" className="gap-1 text-[10px]">
                          <ShieldCheck className="size-3" /> Admin
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>

                  {/* Empresa */}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {user.companyName || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Login: {user.provider === "google" ? "Google" : "E-mail/Senha"}
                    </p>
                  </div>

                  {/* Plano & Botão Rápido */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={isPro ? "brand" : "secondary"}>
                        {isPro ? "PRO (R$ 39)" : "FREE"}
                      </Badge>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => quickTogglePlan(user)}
                        className="text-[11px] font-medium text-brand hover:underline disabled:opacity-50"
                        title={
                          isPro
                            ? "Mudar para o plano Free"
                            : "Ativar plano Pro (R$ 39) em 1 clique"
                        }
                      >
                        {isPro ? "→ Free" : "→ Dar Pro"}
                      </button>
                    </div>
                    {isPro && user.currentPeriodEnd && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Até {formatDate(user.currentPeriodEnd)}
                      </p>
                    )}
                  </div>

                  {/* Uso Mensal / Total */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-semibold">
                        {user.usedThisMonth} no mês
                      </span>
                      <span className="text-muted-foreground">
                        ({user.totalProposals} total)
                      </span>
                    </div>
                    {user.usedThisMonth > 0 && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => quickResetUsage(user)}
                        className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-brand"
                      >
                        <RotateCcw className="size-2.5" /> Zerar mês
                      </button>
                    )}
                  </div>

                  {/* Data de Cadastro */}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </span>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center justify-start gap-1.5 lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setEditingUser(user)}
                    >
                      <PencilLine className="size-3.5" />
                      Gerenciar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => {
                        setPasswordModalUser(user);
                        setNewPassword("");
                      }}
                      title="Trocar a senha deste usuário"
                    >
                      <KeyRound className="size-3.5" />
                      Senha
                    </Button>

                    {user.id !== currentAdminId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={isBusy}
                        onClick={() => handleDeleteUser(user)}
                        title="Excluir usuário"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* MODAL 1: TROCAR SENHA EM 1 CLIQUE */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-semibold">Trocar senha do usuário</h3>
                <p className="text-xs text-muted-foreground">
                  {passwordModalUser.name} ({passwordModalUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-new-pass">Nova senha *</Label>
                <Input
                  id="admin-new-pass"
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  O usuário poderá entrar imediatamente com o e-mail e esta nova senha.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={savingPassword}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="brand" size="sm" disabled={savingPassword}>
                  {savingPassword ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <KeyRound className="size-3.5" />
                  )}
                  Salvar Nova Senha
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GERENCIAR USUÁRIO COMPLETO (PLANO, DADOS, PERMISSÃO ADMIN, SENHA) */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isSelf={editingUser.id === currentAdminId}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
            );
            setEditingUser(null);
            router.refresh();
          }}
        />
      )}

      {/* MODAL 3: CRIAR NOVO USUÁRIO */}
      {createModalOpen && (
        <CreateUserModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            setCreateModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (updated: Partial<AdminUserRow> & { id: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [companyName, setCompanyName] = useState(user.companyName);
  const [plan, setPlan] = useState<"free" | "pro">(user.plan);
  const [proDurationDays, setProDurationDays] = useState(365);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [newPassword, setNewPassword] = useState("");
  const [usageCount, setUsageCount] = useState(String(user.usedThisMonth));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          companyName,
          plan,
          ...(plan === "pro" ? { proDurationDays } : {}),
          isAdmin,
          usageCount: Number.parseInt(usageCount, 10) || 0,
          ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao atualizar usuário.");
      toast.success("Usuário atualizado com sucesso!");
      onSaved(data.user);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-semibold">Gerenciar Usuário</h3>
            <p className="text-xs text-muted-foreground">ID: {user.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Propostas usadas neste mês</Label>
              <Input
                type="number"
                min="0"
                value={usageCount}
                onChange={(e) => setUsageCount(e.target.value)}
              />
            </div>
          </div>

          {/* Plano e Validade */}
          <div className="rounded-xl border bg-muted/25 p-4">
            <Label className="text-xs font-semibold">Plano da Conta</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlan("free")}
                className={cn(
                  "rounded-lg border p-2.5 text-left text-xs font-medium transition-all",
                  plan === "free"
                    ? "border-foreground bg-background shadow-2xs"
                    : "text-muted-foreground hover:bg-background/60"
                )}
              >
                <span className="block font-semibold">Plano Free</span>
                <span className="text-[11px] text-muted-foreground">
                  Limite de 3 propostas/mês
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlan("pro")}
                className={cn(
                  "rounded-lg border p-2.5 text-left text-xs font-medium transition-all",
                  plan === "pro"
                    ? "border-brand bg-brand/10 text-brand shadow-2xs"
                    : "text-muted-foreground hover:bg-background/60"
                )}
              >
                <span className="flex items-center gap-1 font-semibold">
                  <Sparkles className="size-3" /> Plano Pro (R$ 39)
                </span>
                <span className="text-[11px] opacity-80">
                  Ilimitado + PDF White-Label
                </span>
              </button>
            </div>

            {plan === "pro" && (
              <div className="mt-3 space-y-1.5 border-t pt-3">
                <Label className="text-[11px]">Duração / Validade do Plano Pro</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { days: 30, label: "30 dias (Mensal)" },
                    { days: 90, label: "90 dias (Trimestral)" },
                    { days: 365, label: "1 Ano" },
                    { days: 3650, label: "Vitalício (10 anos)" },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setProDurationDays(opt.days)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        proDurationDays === opt.days
                          ? "border-brand bg-brand text-white"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Redefinir Senha (Opcional) */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Trocar senha (deixe em branco para manter a atual)
            </Label>
            <Input
              type="text"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
            />
          </div>

          {/* Permissão de Administrador */}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-xs">
            <input
              type="checkbox"
              checked={isAdmin}
              disabled={isSelf}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="size-4 rounded border"
            />
            <div>
              <span className="font-semibold">Acesso de Administrador (Painel Admin)</span>
              <p className="text-[11px] text-muted-foreground">
                Permite visualizar todos os usuários, alterar planos e redefinir senhas.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: AdminUserRow) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState<"free" | "pro">("pro");
  const [proDurationDays, setProDurationDays] = useState(365);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
          plan,
          proDurationDays,
          isAdmin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar usuário.");
      toast.success("Novo usuário criado com sucesso!");
      onCreated(data.user);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-semibold">Criar Novo Usuário</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha inicial *</Label>
              <Input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa (opcional)</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlan("free")}
              className={cn(
                "rounded-lg border p-2.5 text-left text-xs font-medium",
                plan === "free" ? "border-foreground bg-accent" : "text-muted-foreground"
              )}
            >
              Plano Free
            </button>
            <button
              type="button"
              onClick={() => setPlan("pro")}
              className={cn(
                "rounded-lg border p-2.5 text-left text-xs font-medium",
                plan === "pro" ? "border-brand bg-brand/10 text-brand" : "text-muted-foreground"
              )}
            >
              Plano Pro (R$ 39)
            </button>
          </div>

          {plan === "pro" && (
            <div className="flex flex-wrap gap-1.5">
              {[
                { days: 30, label: "30 dias" },
                { days: 365, label: "1 Ano" },
                { days: 3650, label: "Vitalício" },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setProDurationDays(opt.days)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium",
                    proDurationDays === opt.days
                      ? "border-brand bg-brand text-white"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="size-4 rounded border"
            />
            Conceder permissão de Administrador
          </label>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Criar Conta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
