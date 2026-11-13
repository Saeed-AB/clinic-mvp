"use client";

import { addDays, todayAden } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/** اختيار التاريخ مع أزرار سريعة: أمس، اليوم، غدًا */
export function DateNav({
  value,
  onChange,
  disabled,
  showTomorrow = true,
  max,
}: {
  value: string;
  onChange: (d: string) => void;
  disabled?: boolean;
  showTomorrow?: boolean;
  max?: string;
}) {
  const today = todayAden();
  const quick = [
    { label: "أمس", value: addDays(today, -1) },
    { label: "اليوم", value: today },
    ...(showTomorrow ? [{ label: "غدًا", value: addDays(today, 1) }] : []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="اختيار سريع للتاريخ">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(q.value)}
            aria-pressed={value === q.value}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50",
              value === q.value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        aria-label="التاريخ"
        value={value}
        max={max}
        disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm disabled:bg-muted disabled:text-muted-foreground"
      />
    </div>
  );
}
