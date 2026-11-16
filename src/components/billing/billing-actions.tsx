"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro ao iniciar checkout.");
      window.location.href = data.url;
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Button variant="brand" size="lg" className={className} onClick={subscribe} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Assinar Pro — R$ 39/mês
    </Button>
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
