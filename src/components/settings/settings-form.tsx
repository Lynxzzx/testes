"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { CompanyFields } from "@/components/company-fields";
import { LogoUploader } from "@/components/logo-uploader";
import { TonePicker } from "@/components/tone-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyValues } from "@/lib/company";
import type { Tone } from "@/lib/plans";

export function SettingsForm({
  initialName,
  email,
  initialCompany,
  initialLogo,
  initialTone,
}: {
  initialName: string;
  email: string;
  initialCompany: CompanyValues;
  initialLogo: string;
  initialTone: Tone;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState<CompanyValues>(initialCompany);
  const [logo, setLogo] = useState(initialLogo);
  const [tone, setTone] = useState<Tone>(initialTone);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, logo, tone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar configurações");
      toast.success("Configurações salvas com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      {/* Dados da empresa + Logo */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 className="font-semibold">Dados padrão da empresa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usados automaticamente ao criar novas propostas e no cabeçalho/rodapé dos PDFs.
        </p>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Logo da empresa</Label>
            <LogoUploader value={logo} onChange={setLogo} />
          </div>
          <CompanyFields value={company} onChange={setCompany} />
        </div>
      </section>

      {/* Preferência de tom */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 className="font-semibold">Tom de escrita padrão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pré-selecionado em todas as novas propostas (você ainda pode trocar por proposta).
        </p>
        <div className="mt-4">
          <TonePicker value={tone} onChange={setTone} />
        </div>
      </section>

      {/* Perfil do usuário */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 className="font-semibold">Sua conta</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="user-name">Seu nome</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" value={email} disabled />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" size="lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
