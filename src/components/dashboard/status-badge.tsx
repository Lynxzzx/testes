"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PencilLine,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProposalStatus =
  | "generating"
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "final"
  | "error";

const MAP = {
  generating: { label: "Gerando", variant: "brand", icon: Loader2, spin: true },
  draft: { label: "Rascunho", variant: "secondary", icon: PencilLine, spin: false },
  sent: { label: "Enviada", variant: "brand", icon: Send, spin: false },
  approved: { label: "Aprovada", variant: "success", icon: CheckCircle2, spin: false },
  final: { label: "Aprovada", variant: "success", icon: CheckCircle2, spin: false },
  rejected: { label: "Recusada", variant: "destructive", icon: XCircle, spin: false },
  error: { label: "Erro", variant: "destructive", icon: AlertCircle, spin: false },
} as const;

export const SELECTABLE_STATUSES: {
  value: "draft" | "sent" | "approved" | "rejected";
  label: string;
}[] = [
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviada" },
  { value: "approved", label: "Aprovada" },
  { value: "rejected", label: "Recusada" },
];

export function isApprovedStatus(status?: string | null): boolean {
  return status === "approved" || status === "final";
}

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const s = MAP[status] ?? MAP.draft;
  return (
    <Badge variant={s.variant}>
      <s.icon className={s.spin ? "animate-spin" : undefined} />
      {s.label}
    </Badge>
  );
}

export function StatusSelect({
  proposalId,
  status,
  onStatusChange,
}: {
  proposalId: string;
  status: ProposalStatus;
  onStatusChange?: (next: ProposalStatus) => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<ProposalStatus>(status);
  const [saving, setSaving] = useState(false);

  if (current === "generating" || current === "error") {
    return <StatusBadge status={current} />;
  }

  const s = MAP[current] ?? MAP.draft;

  async function selectStatus(next: "draft" | "sent" | "approved" | "rejected") {
    const normalizedCurrent = current === "final" ? "approved" : current;
    if (next === normalizedCurrent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Não foi possível atualizar o status.");
      setCurrent(next);
      onStatusChange?.(next);
      toast.success(`Status alterado para "${MAP[next].label}".`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving}
        className="inline-flex items-center focus:outline-none"
        title="Alterar status da proposta"
      >
        <Badge
          variant={s.variant}
          className="cursor-pointer gap-1 pr-1.5 transition-opacity hover:opacity-85"
        >
          {saving ? <Loader2 className="animate-spin" /> : <s.icon />}
          {s.label}
          <ChevronDown className="size-3 opacity-70" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {SELECTABLE_STATUSES.map((opt) => {
          const info = MAP[opt.value];
          return (
            <DropdownMenuItem key={opt.value} onSelect={() => selectStatus(opt.value)}>
              <info.icon className="size-4" />
              {opt.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
