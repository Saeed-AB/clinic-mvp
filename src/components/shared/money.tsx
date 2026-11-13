import { formatMoney, formatNumber } from "@/lib/format/money";
import type { Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Money({ value, currency, className, plain }: { value: number; currency?: Currency; className?: string; plain?: boolean }) {
  return <span className={cn("num", className)}>{plain ? formatNumber(value) : formatMoney(value, currency)}</span>;
}

export function Num({ value, className }: { value: number | string; className?: string }) {
  return <span className={cn("num", className)}>{typeof value === "number" ? formatNumber(value) : value}</span>;
}
