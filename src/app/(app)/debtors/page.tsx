"use client";

import { Download, HandCoins, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { Money, Num } from "@/components/shared/money";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatCard } from "@/components/shared/states";
import { errorMessage } from "@/lib/api/client";
import { exportSheet } from "@/lib/excel";
import { formatShortDate, todayAden } from "@/lib/format/date";
import { toLatinDigits } from "@/lib/format/money";
import { reportsService, type DebtorParams } from "@/lib/services/reports";
import { useApi } from "@/lib/use-api";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { useIsAdmin } from "@/stores/session";

function DebtorsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openDrawer = useDrawers((s) => s.openDrawer);
  const isAdmin = useIsAdmin();
  const currency = useLookups((s) => s.data?.clinic.currency);

  const q = params.get("q") ?? "";
  const sort = (params.get("sort") === "oldest" ? "oldest" : "amount") as "amount" | "oldest";
  const inactiveDays = Number(params.get("inactive")) || 0;
  const [term, setTerm] = useState(q);
  const [exporting, setExporting] = useState(false);

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

  const query: DebtorParams = { q, sort, inactiveDays: inactiveDays || "" };
  const { data, error, loading, reload } = useApi(() => reportsService.debtors(query), [q, sort, inactiveDays]);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await reportsService.debtorsExport(query);
      await exportSheet({
        filename: `debtors-${todayAden()}.xlsx`,
        sheetName: "المدينون",
        columns: [
          { header: "رقم الملف", key: "fileNumber", width: 12 },
          { header: "الاسم", key: "name", width: 34 },
          { header: "الجوال", key: "phone", width: 16 },
          { header: "المبلغ المستحق", key: "balance", width: 16, numFmt: "#,##0" },
          { header: "آخر زيارة", key: "lastVisit", width: 14 },
          { header: "آخر سداد", key: "lastPayment", width: 14 },
        ],
        rows: res.rows.map((r) => ({ ...r, phone: r.phone ?? "", lastVisit: r.lastVisit ?? "", lastPayment: r.lastPayment ?? "لم يسدد" })),
        totalRow: { name: `الإجمالي (${res.rows.length} مريض)`, balance: res.rows.reduce((s, r) => s + r.balance, 0) },
      });
      toast.success("تم تصدير ملف الإكسل");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  const filtered = !!q || !!inactiveDays;

  return (
    <div className="space-y-5">
      <PageHeader
        title="المدينون والسداد"
        description="المرضى الذين عليهم مبالغ مستحقة"
        actions={
          isAdmin ? (
            <Button variant="outline" loading={exporting} onClick={exportExcel} disabled={!data?.rows.length}>
              <Download /> تصدير إلى إكسل
            </Button>
          ) : null
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="ملخص الديون">
        <StatCard label="إجمالي الديون" tone="debt" loading={loading && !data} value={<Money value={data?.total ?? 0} currency={currency} />} />
        <StatCard label="عدد المرضى المدينين" loading={loading && !data} value={<Num value={data?.count ?? 0} />} />
      </section>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="بحث برقم الملف أو الجوال" placeholder="بحث برقم الملف أو الجوال" className="ps-9" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="w-44">
          <Select aria-label="الترتيب" value={sort} onChange={(e) => setParam("sort", e.target.value === "oldest" ? "oldest" : "")}>
            <option value="amount">الأعلى مبلغًا</option>
            <option value="oldest">الأقدم سدادًا</option>
          </Select>
        </div>
        <div className="w-52">
          <Select aria-label="فلتر الفترة" value={String(inactiveDays || "")} onChange={(e) => setParam("inactive", e.target.value)}>
            <option value="">كل الفترات</option>
            <option value="30">لم يسدد منذ أكثر من شهر</option>
            <option value="60">لم يسدد منذ أكثر من شهرين</option>
            <option value="90">لم يسدد منذ أكثر من 3 أشهر</option>
          </Select>
        </div>
      </div>

      <Card>
        {loading && !data ? (
          <LoadingRows rows={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data && data.rows.length ? (
          <>
            {filtered ? (
              <p className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
                <Num value={data.rows.length} /> نتيجة بمجموع <Money value={data.rows.reduce((s, r) => s + r.balance, 0)} currency={currency} className="font-medium text-foreground" />
              </p>
            ) : null}
            <Table>
              <thead>
                <tr>
                  <Th>رقم الملف</Th>
                  <Th>الاسم</Th>
                  <Th className="max-sm:hidden">الجوال</Th>
                  <Th className="text-end">المبلغ المستحق</Th>
                  <Th className="max-md:hidden">آخر زيارة</Th>
                  <Th className="max-md:hidden">آخر سداد</Th>
                  <Th>
                    <span className="sr-only">سداد</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.patientId} className="hover:bg-muted/50">
                    <Td>
                      <Num value={String(r.fileNumber)} />
                    </Td>
                    <Td className="font-medium">
                      <Link href={`/patients/${r.patientId}`} className="hover:text-primary hover:underline">
                        {r.name}
                      </Link>
                    </Td>
                    <Td className="max-sm:hidden">{r.phone ? <Num value={r.phone} /> : "—"}</Td>
                    <Td className="text-end font-semibold text-debt">
                      <Money value={r.balance} plain />
                    </Td>
                    <Td className="text-muted-foreground max-md:hidden">
                      <Num value={formatShortDate(r.lastVisit)} />
                    </Td>
                    <Td className="text-muted-foreground max-md:hidden">{r.lastPayment ? <Num value={formatShortDate(r.lastPayment)} /> : "لم يسدد"}</Td>
                    <Td className="text-end">
                      <Button size="sm" variant="secondary" onClick={() => openDrawer("settlement", { patientId: r.patientId })}>
                        <HandCoins /> سداد
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : filtered ? (
          <EmptyState
            title="لا توجد نتائج"
            action={
              <Button variant="outline" onClick={() => { setTerm(""); router.replace(pathname); }}>
                مسح الفلاتر
              </Button>
            }
          />
        ) : (
          <EmptyState title="لا يوجد مرضى مدينون" description="كل المرضى خالصون. الدفع المقدّم يتسجل من ملف المريض." />
        )}
      </Card>
    </div>
  );
}

export default function DebtorsPage() {
  return (
    <Suspense fallback={<LoadingRows rows={8} />}>
      <DebtorsView />
    </Suspense>
  );
}
