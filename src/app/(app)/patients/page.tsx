"use client";

import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHeader, TableRow, Td, Th } from "@/components/ui/table";
import { BalanceBadge } from "@/components/shared/badges";
import { Money, Num } from "@/components/shared/money";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatCard } from "@/components/shared/states";
import type { BalanceIndicator, Gender } from "@/lib/types";
import { toLatinDigits } from "@/lib/format/money";
import { patientsService } from "@/lib/services/patients";
import { useApi } from "@/lib/use-api";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";

function PatientsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openDrawer = useDrawers((s) => s.openDrawer);
  const currency = useLookups((s) => s.data?.clinic.currency);

  const q = params.get("q") ?? "";
  const gender = (params.get("gender") as Gender | null) ?? null;
  const indicator = (params.get("indicator") as BalanceIndicator | null) ?? null;
  const sort = (params.get("sort") as "name" | "fileNumber" | "balance" | null) ?? "name";
  const [term, setTerm] = useState(q);

  useEffect(() => setTerm(q), [q]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  // بحث أثناء الكتابة بتأخير بسيط
  useEffect(() => {
    const t = setTimeout(() => {
      const v = toLatinDigits(term).trim();
      if (v !== q) setParam("q", v);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const filter = { q, gender, indicator, sort };
  const { data, error, loading, reload } = useApi(() => patientsService.list(filter), [q, gender, indicator, sort]);

  const filtered = !!q || !!gender || !!indicator;

  return (
    <div className="space-y-5">
      <PageHeader
        title="المرضى"
        description="كل المرضى المسجلين في العيادة"
        actions={
          <Button onClick={() => openDrawer("patient")}>
            <UserPlus /> مريض جديد
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="ملخص المرضى">
        <StatCard label="إجمالي المرضى" loading={loading && !data} value={<Num value={data?.total ?? 0} />} />
      </section>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="بحث برقم الملف أو الاسم أو الجوال"
            placeholder="بحث برقم الملف أو الاسم أو الجوال"
            className="ps-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select value={gender ?? "all"} onValueChange={(v) => setParam("gender", v === "all" ? "" : v)}>
            <SelectTrigger aria-label="فلتر الجنس">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الجميع</SelectItem>
              <SelectItem value="male">ذكر</SelectItem>
              <SelectItem value="female">أنثى</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={indicator ?? "all"} onValueChange={(v) => setParam("indicator", v === "all" ? "" : v)}>
            <SelectTrigger aria-label="فلتر الرصيد">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأرصدة</SelectItem>
              <SelectItem value="debt">عليه دين</SelectItem>
              <SelectItem value="settled">خالص</SelectItem>
              <SelectItem value="credit">له رصيد</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={sort} onValueChange={(v) => setParam("sort", v === "name" ? "" : v)}>
            <SelectTrigger aria-label="الترتيب">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">بالاسم</SelectItem>
              <SelectItem value="fileNumber">برقم الملف</SelectItem>
              <SelectItem value="balance">بالرصيد</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        {loading && !data ? (
          <LoadingRows rows={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data && data.rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <Th>رقم الملف</Th>
                <Th>الاسم</Th>
                <Th className="max-sm:hidden">الجنس</Th>
                <Th className="max-sm:hidden">الجوال</Th>
                <Th className="max-md:hidden">المنطقة</Th>
                <Th className="text-end">الرصيد</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/patients/${p.id}`)}>
                  <Td>
                    <Num value={String(p.fileNumber)} />
                  </Td>
                  <Td className="font-medium">
                    <Link href={`/patients/${p.id}`} className="hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {p.name}
                    </Link>
                  </Td>
                  <Td className="max-sm:hidden text-muted-foreground">{p.gender === "male" ? "ذكر" : "أنثى"}</Td>
                  <Td className="max-sm:hidden">{p.phone ? <Num value={p.phone} /> : "—"}</Td>
                  <Td className="max-md:hidden text-muted-foreground">{p.area || "—"}</Td>
                  <Td className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Money value={p.balance} currency={currency} className="font-semibold" />
                      <BalanceBadge indicator={p.indicator} />
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : filtered ? (
          <EmptyState
            title="لا توجد نتائج"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setTerm("");
                  router.replace(pathname);
                }}
              >
                مسح الفلاتر
              </Button>
            }
          />
        ) : (
          <EmptyState title="لا يوجد مرضى بعد" description="أضف أول مريض من زر «مريض جديد» بالأعلى." />
        )}
      </Card>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<LoadingRows rows={8} />}>
      <PatientsView />
    </Suspense>
  );
}
