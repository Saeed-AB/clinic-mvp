"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toLatinDigits } from "@/lib/format/money";

/** البحث برقم الملف أو الجوال فقط */
export function PatientSearchBox({ autoFocus, defaultValue = "" }: { autoFocus?: boolean; defaultValue?: string }) {
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
        <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="البحث برقم الملف أو الجوال"
          placeholder="ابحث برقم الملف أو الجوال"
          className="ps-9"
        />
      </div>
      <Button type="submit">بحث</Button>
    </form>
  );
}
