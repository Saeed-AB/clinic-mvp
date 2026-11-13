"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { toLatinDigits } from "@/lib/format/money";
import { cn } from "@/lib/utils";

/** حقل مبلغ: لوحة أرقام على الجوال، ويقبل الأرقام العربية ويحوّلها للاتينية */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { suffix?: string }>(
  function MoneyInput({ className, suffix, onChange, ...props }, ref) {
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          className={cn("num w-full text-start", suffix ? "pe-14" : "", className)}
          onChange={(e) => {
            const cleaned = toLatinDigits(e.target.value).replace(/[^\d]/g, "");
            if (cleaned !== e.target.value) e.target.value = cleaned;
            onChange?.(e);
          }}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    );
  },
);
