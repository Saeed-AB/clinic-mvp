"use client";

import { ChevronLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BalanceBadge, indicatorText } from "@/components/shared/badges";
import { Money, Num } from "@/components/shared/money";
import { PatientSearchBox } from "@/components/shared/patient-search-box";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/shared/states";
import { patientsService } from "@/lib/services/patients";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const openDrawer = useDrawers((s) => s.openDrawer);
  const currency = useLookups((s) => s.data?.clinic.currency);
  const { data, error, loading, reload } = useApi(() => patientsService.search(q), [q]);

  // رقم ملف مطابق ولا يوجد تطابق بالجوال: يفتح ملف المريض مباشرة
  useEffect(() => {
    if (data?.byFileNumber && data.byPhone.length === 0) router.replace(`/patients/${data.byFileNumber.id}`);
  }, [data, router]);

  const list = data ? [...(data.byFileNumber ? [data.byFileNumber] : []), ...data.byPhone.filter((p) => p.id !== data.byFileNumber?.id)] : [];
  const digits = q.replace(/[^\d]/g, "");
  const looksLikePhone = digits.length >= 7;

  return (
    <div className="space-y-5">
      <PageHeader title="نتائج البحث" description={q ? <>عن: <span className="num font-medium text-foreground">{q}</span></> : undefined} />
      <PatientSearchBox defaultValue={q} key={q} />
      <Card>
        {!q ? (
          <EmptyState title="اكتب رقم الملف أو الجوال للبحث" />
        ) : loading ? (
          <LoadingRows rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data?.byFileNumber && data.byPhone.length === 0 ? (
          <LoadingRows rows={1} />
        ) : list.length === 0 ? (
          <EmptyState
            title="لا يوجد مريض بهذا الرقم"
            description="تأكد من الرقم، أو أضف المريض كملف جديد."
            action={
              <Button onClick={() => openDrawer("patient", looksLikePhone ? { phone: digits } : {})}>
                <UserPlus /> مريض جديد
              </Button>
            }
          />
        ) : (
          <>
            <p className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
              <Num value={list.length} /> {list.length === 1 ? "مريض" : list.length <= 10 ? "مرضى" : "مريضًا"} مرتبطون بهذا الرقم
            </p>
            <ul className="divide-y divide-border">
              {list.map((p) => (
                <li key={p.id}>
                  <Link href={`/patients/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60">
                    <span className="num w-14 shrink-0 text-sm text-muted-foreground">#{p.fileNumber}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.age != null ? `${p.age} سنة` : "العمر غير مسجل"}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Money value={Math.abs(p.balance)} currency={currency} className={cn("text-sm font-semibold", indicatorText[p.indicator])} />
                      <BalanceBadge indicator={p.indicator} />
                    </span>
                    <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingRows rows={3} />}>
      <SearchResults />
    </Suspense>
  );
}
