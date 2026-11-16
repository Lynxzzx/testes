"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyValues } from "@/lib/company";
import { cn } from "@/lib/utils";

type Field = {
  key: keyof CompanyValues;
  label: string;
  placeholder: string;
  type?: "textarea";
  span?: boolean;
};

const FIELDS: Field[] = [
  { key: "name", label: "Nome da empresa", placeholder: "Pixel Studio Ltda." },
  { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0001-00" },
  { key: "responsible", label: "Responsável", placeholder: "Nome e cargo" },
  { key: "email", label: "Email comercial", placeholder: "contato@empresa.com.br" },
  { key: "phone", label: "Telefone / WhatsApp", placeholder: "(11) 99999-0000" },
  { key: "website", label: "Site", placeholder: "www.empresa.com.br" },
  { key: "address", label: "Endereço", placeholder: "Cidade - UF", span: true },
  {
    key: "about",
    label: "Sobre a empresa",
    placeholder: "O que vocês fazem, há quanto tempo, para quem...",
    type: "textarea",
    span: true,
  },
  {
    key: "differentials",
    label: "Diferenciais",
    placeholder: "Ex.: +120 projetos entregues, equipe sênior, suporte 24h, garantia de 90 dias...",
    type: "textarea",
    span: true,
  },
];

export function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function CompanyFields({
  value,
  onChange,
  compact,
  only,
}: {
  value: CompanyValues;
  onChange: (v: CompanyValues) => void;
  compact?: boolean;
  only?: (keyof CompanyValues)[];
}) {
  const fields = only ? FIELDS.filter((f) => only.includes(f.key)) : FIELDS;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={cn("space-y-2", f.span && "sm:col-span-2")}>
          <Label htmlFor={`company-${f.key}`}>{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea
              id={`company-${f.key}`}
              value={value[f.key]}
              placeholder={f.placeholder}
              rows={compact ? 2 : 3}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            />
          ) : (
            <Input
              id={`company-${f.key}`}
              value={value[f.key]}
              placeholder={f.placeholder}
              onChange={(e) =>
                onChange({ ...value, [f.key]: f.key === "cnpj" ? formatCnpj(e.target.value) : e.target.value })
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
