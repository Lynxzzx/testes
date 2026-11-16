"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CheckoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState<"subscription" | "pix" | null>(null);

  async function subscribe(paymentMethod: "subscription" | "pix") {
    setLoading(paymentMethod);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro ao iniciar checkout.");
      window.location.href = data.url;
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <Button
        variant="brand"
        size="lg"
        className="w-full"
        onClick={() => subscribe("pix")}
        disabled={!!loading}
      >
        {loading === "pix" ? <Loader2 className="animate-spin" /> : <QrCode />}
        Pagar com Pix (30 dias) — R$ 39
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => subscribe("subscription")}
        disabled={!!loading}
      >
        {loading === "subscription" ? <Loader2 className="animate-spin" /> : <CreditCard />}
        Assinar no Cartão — R$ 39/mês
      </Button>
    </div>
  );
}

export function PortalButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro ao abrir portal.");
      window.location.href = data.url;
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="lg" className="w-full" onClick={openPortal} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <ExternalLink />}
      Gerenciar assinatura no Stripe
    </Button>
  );
}
