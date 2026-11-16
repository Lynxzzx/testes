import { AlertCircle, CheckCircle2, Loader2, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type ProposalStatus = "generating" | "draft" | "final" | "error";

const MAP = {
  generating: { label: "Gerando", variant: "brand", icon: Loader2, spin: true },
  draft: { label: "Rascunho", variant: "secondary", icon: PencilLine, spin: false },
  final: { label: "Finalizada", variant: "success", icon: CheckCircle2, spin: false },
  error: { label: "Erro", variant: "destructive", icon: AlertCircle, spin: false },
} as const;

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const s = MAP[status] ?? MAP.draft;
  return (
    <Badge variant={s.variant}>
      <s.icon className={s.spin ? "animate-spin" : undefined} />
      {s.label}
    </Badge>
  );
}
