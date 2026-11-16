"use client";

import { cn } from "@/lib/utils";
import { TONES, type Tone } from "@/lib/plans";

export function TonePicker({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
      {(Object.keys(TONES) as Tone[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cn(
            "rounded-lg border p-3 text-left transition-all hover:bg-accent/60",
            value === t && "border-brand bg-brand/5 ring-1 ring-brand/30 hover:bg-brand/5"
          )}
        >
          <span className="text-sm font-medium">{TONES[t].label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{TONES[t].description}</span>
        </button>
      ))}
    </div>
  );
}
