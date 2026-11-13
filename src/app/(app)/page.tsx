"use client";

import { ArrowLeft, CalendarDays, CalendarPlus, HandCoins, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Money, Num } from "@/components/shared/money";
import { PatientSearchBox } from "@/components/shared/patient-search-box";
import { EmptyState, ErrorState, LoadingRows, StatCard } from "@/components/shared/states";
import { VisitsTable } from "@/components/shared/visits-table";
import { formatDate, formatWeekday, todayAden } from "@/lib/format/date";
import { reportsService } from "@/lib/services/reports";
import { useApi } from "@/lib/use-api";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { useSession } from "@/stores/session";

export default function DashboardPage() {
  const openDrawer = useDrawers((s) => s.openDrawer);
  const user = useSession((s) => s.user);
  const currency = useLookups((s) => s.data?.clinic.currency);
  const { data, error, loading, reload } = useApi(() => reportsService.dashboard(), []);
  const today = todayAden();
  const first = user?.name?.split(" ").slice(0, 2).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {formatWeekday(today)}، {formatDate(today)}
        </p>
        <h1 className="mt-0.5 text-xl font-bold sm:text-2xl">{first ? `أهلًا ${first}` : "الرئيسية"}</h1>
      </div>

      <Card className="p-4 sm:p-5">
        <PatientSearchBox />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button onClick={() => openDrawer("visit")} className="justify-start">
            <CalendarPlus /> زيارة جديدة
          </Button>
          <Button variant="outline" onClick={() => openDrawer("patient")} className="justify-start">
            <UserPlus /> مريض جديد
          </Button>
          <Link href="/debtors" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-muted max-sm:h-11">
            <HandCoins className="size-4" /> المدينون والسداد
          </Link>
        </div>
      </Card>

      <section aria-label="ملخص اليوم" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="زيارات اليوم" loading={loading && !data} value={<Num value={data?.visitsCount ?? 0} />} icon={<CalendarDays />} />
        <StatCard
          label="زيارات مفتوحة"
          loading={loading && !data}
          tone={data && data.openCount > 0 ? "warning" : "default"}
          value={<Num value={data?.openCount ?? 0} />}
          hint={data && data.openCount > 0 ? "تحتاج إكمال وإغلاق" : undefined}
        />
        <StatCard label="المحصّل اليوم" loading={loading && !data} tone="settled" value={<Money value={data?.collected ?? 0} currency={currency} />} icon={<Wallet />} />
        <StatCard label="ديون جديدة اليوم" loading={loading && !data} tone={data && data.newDebts > 0 ? "debt" : "default"} value={<Money value={data?.newDebts ?? 0} currency={currency} />} />
      </section>

      {data?.admin ? (
        <section aria-label="ملخص الديون" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="إجمالي الديون على المرضى" tone="debt" value={<Money value={data.admin.totalDebts} currency={currency} />} hint="للمدير فقط" />
          <StatCard label="عدد المرضى المدينين" value={<Num value={data.admin.debtorsCount} />} icon={<Users />} hint={<Link href="/debtors" className="text-primary hover:underline">عرض المدينين</Link>} />
        </section>
      ) : null}

      <Card>
        <CardHeader
          title="زيارات اليوم"
          actions={
            <Link href="/visits" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              كل الزيارات <ArrowLeft className="size-4" />
            </Link>
          }
        />
        {loading && !data ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data && data.todayVisits.length ? (
          <VisitsTable rows={data.todayVisits.slice(0, 8)} currency={currency} compact />
        ) : (
          <EmptyState
            title="لا توجد زيارات اليوم بعد"
            description="سجّل أول زيارة لليوم من الزر أدناه."
            action={
              <Button onClick={() => openDrawer("visit")}>
                <CalendarPlus /> زيارة جديدة
              </Button>
            }
          />
        )}
        {data && data.todayVisits.length > 8 ? (
          <div className="border-t border-border p-3 text-center">
            <Link href="/visits" className="text-sm font-medium text-primary hover:underline">
              عرض كل الزيارات (<Num value={data.todayVisits.length} />)
            </Link>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
