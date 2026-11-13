"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toLatinDigits } from "@/lib/format/money";
import { cn } from "@/lib/utils";

/** البحث برقم الملف أو الجوال فقط */
export function PatientSearchBox({ size = "md", autoFocus, defaultValue = "" }: { size?: "md" | "lg"; autoFocus?: boolean; defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = toLatinDigits(q).trim();
        if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
      }}
      className="flex w-full gap-2"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="البحث برقم الملف أو الجوال"
          placeholder="ابحث برقم الملف أو الجوال"
          className={cn(
            "w-full rounded-xl border border-border bg-surface pe-3 ps-11 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
            size === "lg" ? "h-14 text-lg" : "h-10 text-sm",
          )}
        />
      </div>
      <Button type="submit" size={size === "lg" ? "lg" : "md"} className={size === "lg" ? "h-14 px-6" : ""}>
        بحث
      </Button>
    </form>
  );
}
