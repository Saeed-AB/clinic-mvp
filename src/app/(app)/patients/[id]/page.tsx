"use client";

import { CalendarPlus, HandCoins, Pencil, Phone, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CancelledBadge, INDICATOR_LABEL, indicatorText } from "@/components/shared/badges";
import { Money, Num } from "@/components/shared/money";
import { MoneyInput } from "@/components/shared/money-input";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/states";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format/date";
import { CURRENCY_LABEL } from "@/lib/format/money";
import { patientsService } from "@/lib/services/patients";
import type { LedgerType } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { useIsAdmin } from "@/stores/session";

const TYPE_LABEL: Record<LedgerType, string> = { visit: "زيارة", payment: "دفعة", settlement: "سداد", opening: "رصيد افتتاحي" };
const TYPE_CLASS: Record<LedgerType, string> = {
  visit: "bg-scheduled-soft text-scheduled",
  payment: "bg-settled-soft text-settled",
  settlement: "bg-credit-soft text-credit",
  opening: "bg-warning-soft text-warning",
};
const PAGE = 50;

export default function PatientPage() {
  const { id } = useParams<{ id: string }>();
  const openDrawer = useDrawers((s) => s.openDrawer);
  const bump = useDrawers((s) => s.bump);
  const isAdmin = useIsAdmin();
  const currency = useLookups((s) => s.data?.clinic.currency) ?? "YER";
  const patient = useApi(() => patientsService.get(id), [id]);
  const ledger = useApi(() => patientsService.ledger(id), [id]);
  const [page, setPage] = useState(1);
  const [obOpen, setObOpen] = useState(false);

  if (patient.loading && !patient.data) return <LoadingRows rows={6} />;
  if (patient.error && !patient.data) return <ErrorState message={patient.error} onRetry={patient.reload} />;
  const p = patient.data;
  if (!p) return null;

  const entries = ledger.data ?? [];
  const shown = entries.slice(0, page * PAGE);

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              ملف رقم <Num value={String(p.fileNumber)} className="font-semibold text-foreground" />
            </p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{p.gender === "male" ? "ذكر" : "أنثى"}</span>
              <span>{p.age != null ? `${p.age} سنة` : "العمر غير مسجل"}</span>
              {p.phone ? (
                <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="size-3.5" /> <Num value={p.phone} />
                </a>
              ) : (
                <span>بدون جوال</span>
              )}
              {p.area ? <span>{p.area}</span> : null}
            </div>
            {p.notes ? <p className="mt-2 text-sm">{p.notes}</p> : null}
          </div>

          <div className={cn("rounded-xl px-5 py-3 text-end", p.indicator === "debt" ? "bg-debt-soft" : p.indicator === "credit" ? "bg-credit-soft" : "bg-settled-soft")}>
            <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
            <p className={cn("text-3xl font-bold", indicatorText[p.indicator])}>
              <Money value={Math.abs(p.balance)} currency={currency} />
            </p>
            <p className={cn("mt-0.5 text-sm font-semibold", indicatorText[p.indicator])}>{INDICATOR_LABEL[p.indicator]}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button onClick={() => openDrawer("visit", { patientId: p.id })}>
            <CalendarPlus /> زيارة جديدة
          </Button>
          <Button variant="outline" onClick={() => openDrawer("settlement", { patientId: p.id })}>
            <HandCoins /> تسجيل سداد
          </Button>
          <Button variant="outline" onClick={() => openDrawer("patient", { editPatientId: p.id })}>
            <Pencil /> تعديل البيانات
          </Button>
          {isAdmin ? (
            <Button variant="ghost" onClick={() => setObOpen(true)}>
              <PlusCircle /> إضافة رصيد افتتاحي
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="سجل الحركات" description="من الأحدث للأقدم" />
        {ledger.loading && !ledger.data ? (
          <LoadingRows rows={5} />
        ) : ledger.error ? (
          <ErrorState message={ledger.error} onRetry={ledger.reload} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="لا توجد حركات بعد"
            description="سجّل أول زيارة لهذا المريض."
            action={
              <Button onClick={() => openDrawer("visit", { patientId: p.id })}>
                <CalendarPlus /> زيارة جديدة
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>التاريخ</Th>
                  <Th>النوع</Th>
                  <Th className="max-md:hidden">الطبيب</Th>
                  <Th>التفاصيل</Th>
                  <Th className="text-end">مدين</Th>
                  <Th className="text-end">دائن</Th>
                  <Th className="text-end">الرصيد بعدها</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={`${e.type}-${e.id}`} className={cn(e.cancelled && "text-muted-foreground", e.visitId && e.type === "visit" && "hover:bg-muted/50")}>
                    <Td className="text-xs whitespace-nowrap">
                      <Num value={formatDateTime(e.date)} />
                    </Td>
                    <Td>
                      <Badge className={TYPE_CLASS[e.type]}>{TYPE_LABEL[e.type]}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground max-md:hidden">{e.doctorName ?? "—"}</Td>
                    <Td className="min-w-48">
                      <span className={cn(e.cancelled && "line-through")}>
                        {e.type === "visit" && e.visitId ? (
                          <Link href={`/visits/${e.visitId}`} className="text-primary hover:underline">
                            {e.details}
                          </Link>
                        ) : (
                          e.details
                        )}
                      </span>
                      {e.cancelled ? (
                        <span className="ms-2">
                          <CancelledBadge reason={e.cancelReason} />
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-end">{e.debit ? <Money value={e.debit} plain className="text-debt" /> : "—"}</Td>
                    <Td className="text-end">{e.credit ? <Money value={e.credit} plain className="text-settled" /> : "—"}</Td>
                    <Td className="text-end font-semibold">
                      <Money value={e.balanceAfter} plain className={cn(e.balanceAfter > 0 ? "text-debt" : e.balanceAfter < 0 ? "text-credit" : "")} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {entries.length > shown.length ? (
              <div className="border-t border-border p-3 text-center">
                <Button variant="outline" onClick={() => setPage((x) => x + 1)}>
                  عرض المزيد (<Num value={entries.length - shown.length} /> حركة متبقية)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <OpeningBalanceDialog
        open={obOpen}
        onOpenChange={setObOpen}
        currencyLabel={CURRENCY_LABEL[currency]}
        onSave={async (amount, note) => {
          await patientsService.addOpeningBalance(p.id, { amount, note });
          toast.success("تمت إضافة الرصيد الافتتاحي");
          bump();
        }}
      />
    </div>
  );
}

function OpeningBalanceDialog({
  open,
  onOpenChange,
  onSave,
  currencyLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (amount: number, note: string | null) => Promise<void>;
  currencyLabel: string;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setAmount("");
          setNote("");
          setErr(null);
        }
      }}
      title="إضافة رصيد افتتاحي"
      description="دين قديم من الدفتر يُضاف على رصيد المريض."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            تراجع
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              const n = Number(amount);
              if (!(n > 0)) return setErr("أدخل مبلغًا أكبر من صفر");
              setBusy(true);
              try {
                await onSave(n, note.trim() || null);
                onOpenChange(false);
                setAmount("");
                setNote("");
              } catch (e) {
                setErr(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            إضافة الرصيد
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="المبلغ" htmlFor="ob-amount" required error={err ?? undefined}>
          <MoneyInput id="ob-amount" autoFocus value={amount} suffix={currencyLabel} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!err} />
        </Field>
        <Field label="ملاحظة" htmlFor="ob-note">
          <Textarea id="ob-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: منقول من الدفتر" />
        </Field>
      </div>
    </Dialog>
  );
}
