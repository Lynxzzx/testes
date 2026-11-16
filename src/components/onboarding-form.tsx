"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CompanyFields } from "@/components/company-fields";
import { LogoUploader } from "@/components/logo-uploader";
import { TonePicker } from "@/components/tone-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CompanyValues } from "@/lib/company";
import type { Tone } from "@/lib/plans";
import { cn } from "@/lib/utils";

const STEPS = ["Sua empresa", "Diferenciais", "Preferências"];

export function OnboardingForm({
  firstName,
  initialCompany,
  initialLogo,
  initialTone,
  nextUrl,
}: {
  firstName: string;
  initialCompany: CompanyValues;
  initialLogo: string;
  initialTone: Tone;
  nextUrl: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState(initialCompany);
  const [logo, setLogo] = useState(initialLogo);
  const [tone, setTone] = useState<Tone>(initialTone);
  const [saving, setSaving] = useState(false);

  async function finish(skip = false) {
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skip ? { onboarded: true } : { company, logo, tone, onboarded: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar");
      toast.success("Tudo pronto! Vamos criar sua primeira proposta.");
      router.push(nextUrl === "/dashboard" ? "/dashboard/propostas/nova" : nextUrl);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-brand">Passo {step + 1} de {STEPS.length}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {step === 0 && `Olá${firstName ? `, ${firstName}` : ""}! Conte sobre sua empresa`}
        {step === 1 && "O que torna vocês únicos?"}
        {step === 2 && "Como você prefere escrever?"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {step === 0 && "Esses dados aparecem no cabeçalho e rodapé das suas propostas."}
        {step === 1 && "A IA usa essas informações para argumentar por que o cliente deve escolher você."}
        {step === 2 && "Você pode mudar o tom em cada proposta. Este será o padrão."}
      </p>

      <div className="mt-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full bg-border", i <= step && "bg-brand")} />
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-background p-6 shadow-xs">
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Logo</Label>
              <LogoUploader value={logo} onChange={setLogo} />
            </div>
            <CompanyFields
              value={company}
              onChange={setCompany}
              only={["name", "cnpj", "responsible", "email", "phone", "website"]}
            />
          </div>
        )}
        {step === 1 && (
          <CompanyFields value={company} onChange={setCompany} only={["about", "differentials", "address"]} />
        )}
        {step === 2 && <TonePicker value={tone} onChange={setTone} />}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
            <ArrowLeft /> Voltar
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>
            Pular por enquanto
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !company.name.trim()}>
            Continuar <ArrowRight />
          </Button>
        ) : (
          <Button variant="brand" onClick={() => finish()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}
