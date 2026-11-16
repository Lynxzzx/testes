import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingCards({
  freeCta,
  proCta,
}: {
  freeCta?: React.ReactNode;
  proCta?: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      {[PLANS.free, PLANS.pro].map((plan) => {
        const pro = plan.id === "pro";
        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-background p-8",
              pro && "border-brand/40 shadow-xl shadow-brand/10 ring-1 ring-brand/20"
            )}
          >
            {pro && (
              <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-0.5 text-xs font-medium text-white">
                Mais popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {pro ? "Para quem envia propostas toda semana." : "Para experimentar sem compromisso."}
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">R$ {plan.price}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className={cn("mt-0.5 size-4 shrink-0", pro ? "text-brand" : "text-muted-foreground")} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {pro
                ? proCta ?? (
                    <Button asChild variant="brand" className="w-full" size="lg">
                      <Link href="/cadastro?plano=pro">Assinar o Pro</Link>
                    </Button>
                  )
                : freeCta ?? (
                    <Button asChild variant="outline" className="w-full" size="lg">
                      <Link href="/cadastro">Começar grátis</Link>
                    </Button>
                  )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
