"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const BRAND_PRESETS = [
  { name: "Índigo", hex: "#4f46e5" },
  { name: "Violeta", hex: "#7c3aed" },
  { name: "Azul Oceano", hex: "#0284c7" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Esmeralda", hex: "#059669" },
  { name: "Âmbar", hex: "#d97706" },
  { name: "Rubi", hex: "#e11d48" },
  { name: "Grafite", hex: "#0f172a" },
] as const;

export function BrandColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "#4f46e5";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {BRAND_PRESETS.map((preset) => {
          const active = normalized === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              onClick={() => onChange(preset.hex)}
              title={preset.name}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-accent/60",
                active && "border-foreground/40 bg-accent ring-1 ring-foreground/20"
              )}
            >
              <span
                className="flex size-4 items-center justify-center rounded-full text-white shadow-2xs"
                style={{ backgroundColor: preset.hex }}
              >
                {active && <Check className="size-2.5 stroke-[3]" />}
              </span>
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <label className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border shadow-xs">
          <input
            type="color"
            value={normalized}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 size-14 cursor-pointer border-0 bg-transparent p-0"
            aria-label="Selecionar cor personalizada"
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#4f46e5"
          maxLength={7}
          className="w-32 font-mono text-xs uppercase"
        />
        <span className="text-xs text-muted-foreground">
          Aplicada nos títulos, tabelas, barras e destaques do PDF.
        </span>
      </div>
    </div>
  );
}
