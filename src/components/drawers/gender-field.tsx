"use client";

import { cn } from "@/lib/utils";

export function GenderField({ value, onChange, invalid, id }: { value?: string; onChange: (v: "male" | "female") => void; invalid?: boolean; id?: string }) {
  const opts = [
    { v: "male" as const, label: "ذكر" },
    { v: "female" as const, label: "أنثى" },
  ];
  return (
    <div id={id} role="radiogroup" aria-label="الجنس" aria-invalid={invalid || undefined} className="grid grid-cols-2 gap-2">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-10 rounded-lg border text-sm font-medium transition-colors max-sm:h-11",
            value === o.v ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-muted",
            invalid && value !== o.v ? "border-debt/60" : "",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
