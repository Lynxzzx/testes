import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function UsageMeter({
  plan,
  used,
  limit,
  className,
}: {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
  className?: string;
}) {
  if (plan === "pro") {
    return (
      <div className={cn("rounded-lg border bg-gradient-to-br from-brand/5 to-violet-500/5 p-3", className)}>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-brand" /> Plano Pro
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Propostas ilimitadas · {used} este mês</p>
      </div>
    );
  }
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className={cn("rounded-lg border p-3", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Plano Free</span>
        <span className="text-muted-foreground">
          {used}/{limit} este mês
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-brand transition-all", pct >= 100 && "bg-amber-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        href="/dashboard/plano"
        className="mt-3 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        <Zap className="size-3" /> Fazer upgrade para o Pro
      </Link>
    </div>
  );
}
