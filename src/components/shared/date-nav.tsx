"use client";

import { DateField } from "@/components/shared/date-field";

/** اختيار التاريخ عبر منتقي تاريخ (Calendar) — يغطي أي تاريخ بنفسه، بدون أزرار فلاتر سريعة إضافية */
export function DateNav({
  value,
  onChange,
  disabled,
  min,
  max,
}: {
  value: string;
  onChange: (d: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  return <DateField value={value} onChange={onChange} min={min} max={max} disabled={disabled} />;
}
