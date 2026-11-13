"use client";

import { AlertTriangle, Printer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { CancelledBadge } from "@/components/shared/badges";
import { DateNav } from "@/components/shared/date-nav";
import { Money, Num } from "@/components/shared/money";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatCard } from "@/components/shared/states";
import { formatDate, todayAden } from "@/lib/format/date";
import { reportsService } from "@/lib/services/reports";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { useLookups } from "@/stores/lookups";
import { useIsAdmin } from "@/stores/session";

function ClosingView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const lookups = useLookups((s) => s.data);
  const currency = lookups?.clinic.currency;
  const today = todayAden();
  const date = isAdmin ? params.get("date") || today : today;
  const { data, error, loading, reload } = useApi(() => reportsService.dailyClosing(date), [date]);

  return (
    <div className="space-y-5">
      <div className="print-only mb-2 border-b border-black pb-3 text-center">
        <p className="text-lg font-bold">{lookups?.clinic.name}</p>
        <p className="text-sm">الإقفال اليومي — {formatDate(date)}</p>
      </div>
      <PageHeader
        title="الإقفال اليومي"
        description={formatDate(date)}
        actions={
          <Button variant="outline" onClick={() => window.print()} disabled={!data}>
            <Printer /> طباعة
          </Button>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-3">
        <DateNav value={date} onChange={(d) => router.replace(d === today ? pathname : `${pathname}?date=${d}`)} disabled={!isAdmin} showTomorrow={false} max={today} />
        {!isAdmin ? <p className="text-xs text-muted-foreground">المسجل يعرض إقفال يومه فقط</p> : null}
      </div>

      {loading && !data ? (
        <LoadingRows rows={8} />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : data ? (
        <>
          {data.openVisits.length ? (
            <div role="alert" className="no-print rounded-xl border border-open/30 bg-open-soft p-4">
              <p className="flex items-center gap-2 font-semibold text-open">
                <AlertTriangle className="size-5" /> <Num value={data.openVisits.length} /> زيارات ما زالت مفتوحة
              </p>
              <p className="mt-1 text-sm text-open/90">أكمل خدماتها وأغلقها قبل نهاية اليوم. المتبقي منها محسوب دينًا على المرضى.</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.openVisits.map((v) => (
                  <li key={v.id}>
                    <Link href={`/visits/${v.id}`} className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-sm hover:underline">
                      {v.patientName} <span className="num text-xs text-muted-foreground">#{v.number}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="الملخص">
            <StatCard label="عدد الزيارات" value={<Num value={data.visitsCount} />} />
            <StatCard label="إجمالي قيمة الخدمات" value={<Money value={data.servicesTotal} currency={currency} />} />
            <StatCard label="إجمالي الخصومات" value={<Money value={data.discountsTotal} currency={currency} />} />
            <StatCard label="الديون الجديدة" tone={data.newDebts > 0 ? "debt" : "default"} value={<Money value={data.newDebts} currency={currency} />} />
          </section>

          <Card className="print-break-avoid p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">إجمالي المحصّل</p>
            <p className="mt-1 text-3xl font-bold text-settled">
              <Money value={data.collected} currency={currency} />
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">منه من زيارات اليوم</span>
                <Money value={data.collectedFromToday} currency={currency} className="font-semibold" />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">منه سداد ديون سابقة</span>
                <Money value={data.collectedFromPrevious} currency={currency} className="font-semibold" />
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            <SmallTable
              title="المحصّل حسب طريقة الدفع"
              head={["الطريقة", "العمليات", "المبلغ"]}
              rows={data.byMethod.map((m) => [m.name, <Num key="c" value={m.count} />, <Money key="a" value={m.amount} plain />])}
              total={<Money value={data.byMethod.reduce((s, m) => s + m.amount, 0)} plain />}
              empty="لا يوجد تحصيل"
            />
            <SmallTable
              title="الخصومات حسب المستخدم"
              head={["المستخدم", "الزيارات", "المبلغ"]}
              rows={data.discountsByUser.map((u) => [u.name, <Num key="c" value={u.count} />, <Money key="a" value={u.amount} plain />])}
              empty="لا توجد خصومات"
            />
            <SmallTable
              title="حسب الطبيب"
              head={["الطبيب", "الزيارات", "الخدمات"]}
              rows={data.byDoctor.map((d) => [d.name, <Num key="c" value={d.visits} />, <Money key="a" value={d.services} plain />])}
              empty="لا توجد زيارات"
            />
          </div>

          <Card className="print-break-avoid">
            <CardHeader title="حركات اليوم" description="كل الدفعات والسدادات المسجلة" />
            {data.transactions.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>الوقت</Th>
                    <Th>النوع</Th>
                    <Th>المريض</Th>
                    <Th>الطريقة</Th>
                    <Th>المسجل</Th>
                    <Th className="text-end">المبلغ</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id} className={cn(t.cancelled && "text-muted-foreground")}>
                      <Td>
                        <Num value={t.time} />
                      </Td>
                      <Td>{t.type === "settlement" ? "سداد" : "دفعة زيارة"}</Td>
                      <Td>
                        <Link href={`/patients/${t.patientId}`} className="hover:underline">
                          {t.patientName}
                        </Link>{" "}
                        <span className="num text-xs text-muted-foreground">#{t.fileNumber}</span>
                      </Td>
                      <Td>{t.methodName}</Td>
                      <Td className="text-muted-foreground">{t.userName}</Td>
                      <Td className="text-end font-medium">
                        <Money value={t.amount} plain className={cn(t.cancelled && "line-through")} />
                        {t.cancelled ? (
                          <span className="ms-2">
                            <CancelledBadge />
                          </span>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="لا توجد حركات مالية في هذا اليوم" className="py-8" />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function SmallTable({ title, head, rows, total, empty }: { title: string; head: string[]; rows: ReactNode[][]; total?: ReactNode; empty: string }) {
  return (
    <Card className="print-break-avoid">
      <CardHeader title={title} />
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              {head.map((h, i) => (
                <Th key={h} className={i > 0 ? "text-end" : ""}>
                  {h}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <Td key={j} className={j > 0 ? "text-end" : ""}>
                    {c}
                  </Td>
                ))}
              </tr>
            ))}
            {total ? (
              <tr className="font-semibold">
                <Td>الإجمالي</Td>
                <Td />
                <Td className="text-end">{total}</Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </Card>
  );
}

export default function DailyClosingPage() {
  return (
    <Suspense fallback={<LoadingRows rows={8} />}>
      <ClosingView />
    </Suspense>
  );
}
