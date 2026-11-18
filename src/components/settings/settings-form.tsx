"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { BrandColorPicker } from "@/components/brand-color-picker";
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
  initialBrandColor,
  initialTone,
}: {
  initialName: string;
  email: string;
  initialCompany: CompanyValues;
  initialLogo: string;
  initialBrandColor: string;
  initialTone: Tone;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState<CompanyValues>(initialCompany);
  const [logo, setLogo] = useState(initialLogo);
  const [brandColor, setBrandColor] = useState(initialBrandColor || "#4f46e5");
  const [tone, setTone] = useState<Tone>(initialTone);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validColor = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#4f46e5";
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, logo, brandColor: validColor, tone }),
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
      {/* Identidade Visual e Dados da Empresa */}
      <section className="rounded-xl border bg-background p-6 shadow-xs">
        <h2 className="font-semibold">Identidade visual e dados da empresa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu logotipo, cor da marca e dados institucionais são aplicados automaticamente nos PDFs gerados.
        </p>

        <div className="mt-6 space-y-6">
          <div className="grid gap-6 border-b pb-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Logotipo da empresa</Label>
              <LogoUploader value={logo} onChange={setLogo} />
            </div>
            <div className="space-y-2">
              <Label>Cor primária da marca no PDF</Label>
              <BrandColorPicker value={brandColor} onChange={setBrandColor} />
            </div>
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
