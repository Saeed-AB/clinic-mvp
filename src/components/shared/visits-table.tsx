"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableHeader, TableRow, Td, Th } from "@/components/ui/table";
import type { Currency, VisitRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VisitStatusBadge } from "./badges";
import { Money, Num } from "./money";

/** جدول الزيارات: جدول على الشاشات الكبيرة وبطاقات على الجوال. الزيارات المفتوحة بارزة */
export function VisitsTable({ rows, currency, compact }: { rows: VisitRow[]; currency?: Currency; compact?: boolean }) {
  const router = useRouter();
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <Th>الوقت</Th>
              <Th>رقم الملف</Th>
              <Th>الاسم</Th>
              <Th>الطبيب</Th>
              <Th>الحالة</Th>
              {!compact ? (
                <>
                  <Th className="text-end">الإجمالي</Th>
                  <Th className="text-end">المدفوع</Th>
                </>
              ) : null}
              <Th className="text-end">المتبقي</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                onClick={() => router.push(`/visits/${r.id}`)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/60",
                  r.status === "open" && "bg-open-soft/50 shadow-[inset_-3px_0_0_var(--color-open)]",
                  r.status === "cancelled" && "text-muted-foreground",
                )}
              >
                <Td>
                  <Num value={r.time} className="text-muted-foreground" />
                </Td>
                <Td>
                  <Num value={String(r.fileNumber)} />
                </Td>
                <Td className="font-medium">
                  <Link href={`/visits/${r.id}`} onClick={(e) => e.stopPropagation()} className={cn("hover:underline", r.status === "cancelled" && "line-through")}>
                    {r.patientName}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">{r.doctorName}</Td>
                <Td>
                  <VisitStatusBadge status={r.status} />
                </Td>
                {!compact ? (
                  <>
                    <Td className="text-end">
                      <Money value={r.total} currency={currency} plain />
                    </Td>
                    <Td className="text-end">
                      <Money value={r.paid} currency={currency} plain />
                    </Td>
                  </>
                ) : null}
                <Td className={cn("text-end font-medium", r.remaining > 0 && "text-debt")}>
                  <Money value={r.remaining} currency={currency} plain />
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/visits/${r.id}`}
              className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/60", r.status === "open" && "bg-open-soft/50 shadow-[inset_-3px_0_0_var(--color-open)]")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate font-medium", r.status === "cancelled" && "text-muted-foreground line-through")}>{r.patientName}</span>
                  <VisitStatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Num value={r.time} /> · ملف <Num value={String(r.fileNumber)} /> · {r.doctorName}
                </p>
              </div>
              <div className="text-end">
                <p className={cn("text-sm font-semibold", r.remaining > 0 ? "text-debt" : "text-muted-foreground")}>
                  <Money value={r.remaining} currency={currency} plain />
                </p>
                <p className="text-[11px] text-muted-foreground">متبقي</p>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
