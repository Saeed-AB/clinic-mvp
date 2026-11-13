"use client";

import { CalendarPlus, FilterX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateNav } from "@/components/shared/date-nav";
import { Money, Num } from "@/components/shared/money";
import { EmptyState, ErrorState, LoadingRows, PageHeader, StatCard } from "@/components/shared/states";
import { STATUS_LABEL } from "@/components/shared/badges";
import { VisitsTable } from "@/components/shared/visits-table";
import { formatDate, todayAden } from "@/lib/format/date";
import { visitsService } from "@/lib/services/visits";
import type { VisitStatus } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";

function VisitsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const openDrawer = useDrawers((s) => s.openDrawer);
  const lookups = useLookups((s) => s.data);
  const currency = lookups?.clinic.currency;

  const date = params.get("date") || todayAden();
  const status = (params.get("status") || "") as VisitStatus | "";
  const doctorId = params.get("doctor") || "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const { data, error, loading, reload } = useApi(() => visitsService.list({ date, status, doctorId }), [date, status, doctorId]);
  const filtered = !!status || !!doctorId;

  return (
    <div className="space-y-5">
      <PageHeader
        title="الزيارات"
        description={formatDate(date)}
        actions={
          <Button onClick={() => openDrawer("visit")}>
            <CalendarPlus /> زيارة جديدة
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DateNav value={date} onChange={(d) => setParam("date", d === todayAden() ? "" : d)} />
        <div className="flex flex-1 flex-wrap gap-2 sm:flex-none">
          <div className="w-full min-w-36 sm:w-40">
            <Select value={status || "all"} onValueChange={(v) => setParam("status", v === "all" ? "" : v)}>
              <SelectTrigger aria-label="فلتر الحالة">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {(Object.keys(STATUS_LABEL) as VisitStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-40 sm:w-48">
            <Select value={doctorId || "all"} onValueChange={(v) => setParam("doctor", v === "all" ? "" : v)}>
              <SelectTrigger aria-label="فلتر الطبيب">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأطباء</SelectItem>
                {lookups?.doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <section aria-label="ملخص" className="grid grid-cols-3 gap-3">
        <StatCard label="عدد الزيارات" loading={loading && !data} value={<Num value={data?.summary.count ?? 0} />} />
        <StatCard label="منها مفتوحة" loading={loading && !data} tone={data && data.summary.open > 0 ? "warning" : "default"} value={<Num value={data?.summary.open ?? 0} />} />
        <StatCard label="إجمالي المحصّل" loading={loading && !data} tone="settled" value={<Money value={data?.summary.collected ?? 0} currency={currency} />} />
      </section>

      <Card>
        {loading && !data ? (
          <LoadingRows rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data && data.rows.length ? (
          <VisitsTable rows={data.rows} currency={currency} />
        ) : filtered ? (
          <EmptyState
            title="لا توجد زيارات تطابق الفلتر"
            icon={<FilterX className="size-6" />}
            action={
              <Button variant="outline" onClick={() => router.replace(`${pathname}${date !== todayAden() ? `?date=${date}` : ""}`)}>
                مسح الفلاتر
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="لا توجد زيارات في هذا اليوم"
            action={
              <Button onClick={() => openDrawer("visit")}>
                <CalendarPlus /> زيارة جديدة
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

export default function VisitsPage() {
  return (
    <Suspense fallback={<LoadingRows rows={6} />}>
      <VisitsView />
    </Suspense>
  );
}
