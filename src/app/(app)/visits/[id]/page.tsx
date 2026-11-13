"use client";

import { ArrowRight, Ban, Check, CheckCircle2, Lock, Pencil, Plus, Printer, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { BalanceBadge, CancelledBadge, VisitStatusBadge, indicatorText } from "@/components/shared/badges";
import { CancelWithReasonDialog, ConfirmDialog } from "@/components/shared/cancel-dialog";
import { Money, Num } from "@/components/shared/money";
import { MoneyInput } from "@/components/shared/money-input";
import { EmptyState, ErrorState, LoadingRows } from "@/components/shared/states";
import { errorMessage } from "@/lib/api/client";
import { can } from "@/lib/domain/permissions";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { CURRENCY_LABEL, formatMoney, toLatinDigits } from "@/lib/format/money";
import { visitsService } from "@/lib/services/visits";
import type { VisitDetails } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { useSession } from "@/stores/session";

export default function VisitDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bump = useDrawers((s) => s.bump);
  const role = useSession((s) => s.user?.role);
  const lookups = useLookups((s) => s.data);
  const { data, error, loading, reload, setData } = useApi(() => visitsService.get(id), [id]);

  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelService, setCancelService] = useState<string | null>(null);
  const [cancelPayment, setCancelPayment] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <LoadingRows rows={8} />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { visit, patient, doctor, services, payments, totals, clinic } = data;
  const currency = visit.currency;
  const status = visit.status;
  const isCancelled = status === "cancelled";
  const canEdit = !isCancelled && can(role, "visit.editServices", { visitStatus: status });
  const canPay = !isCancelled && status !== "scheduled" && can(role, "visit.pay", { visitStatus: status });
  const canCancelPay = can(role, "payment.cancel", { visitStatus: status });
  const lockedForMe = status === "completed" && role !== "admin";

  /** ينفذ عملية ويحدّث الصفحة بالنتيجة */
  async function run(key: string, fn: () => Promise<VisitDetails>, success?: string) {
    setBusy(key);
    try {
      const d = await fn();
      setData(d);
      bump();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* رأس الطباعة */}
      <div className="print-only mb-4 border-b border-black pb-3 text-center">
        <p className="text-lg font-bold">{clinic.name}</p>
        <p className="text-xs">{clinic.address}</p>
        <p className="num text-xs">{clinic.phone}</p>
      </div>

      <div className="no-print">
        <button onClick={() => router.back()} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" /> رجوع
        </button>
      </div>

      {/* الرأس */}
      <Card className="print-plain p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">
                زيارة رقم <Num value={String(visit.number)} />
              </h1>
              <VisitStatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(visit.date)}</p>
            <p>
              <Link href={`/patients/${patient.id}`} className="font-medium text-primary hover:underline">
                {patient.name}
              </Link>
              <span className="text-sm text-muted-foreground">
                {" "}· ملف <Num value={String(patient.fileNumber)} />
              </span>
            </p>
            <p className="text-sm text-muted-foreground">الطبيب: {doctor.name}</p>
            {isCancelled ? (
              <p className="rounded-md bg-cancelled-soft px-2.5 py-1.5 text-sm text-cancelled">سبب الإلغاء: {visit.cancelReason}</p>
            ) : null}
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-end">
            <p className="text-xs text-muted-foreground">رصيد المريض الكلي</p>
            <p className={cn("text-xl font-bold", indicatorText[patient.indicator])}>
              <Money value={Math.abs(patient.balance)} currency={currency} />
            </p>
            <BalanceBadge indicator={patient.indicator} className="mt-1" />
          </div>
        </div>

        <div className="no-print mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {status === "scheduled" ? (
            <Button loading={busy === "checkin"} onClick={() => run("checkin", () => visitsService.checkIn(visit.id), "تم تسجيل الحضور، والزيارة الآن مفتوحة").catch(() => null)}>
              <UserCheck /> تسجيل الحضور
            </Button>
          ) : null}
          {status === "open" ? (
            <Button onClick={() => setCloseOpen(true)}>
              <CheckCircle2 /> إغلاق الزيارة
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> طباعة
          </Button>
          {role === "admin" && !isCancelled ? (
            <Button variant="ghost" className="text-debt hover:bg-debt-soft" onClick={() => setCancelOpen(true)}>
              <Ban /> إلغاء الزيارة
            </Button>
          ) : null}
        </div>
        {lockedForMe ? (
          <p className="no-print mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-4" /> الزيارة مغلقة. التعديل أو الإلغاء بعد الإغلاق للمدير فقط.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* الخدمات */}
          <Card className="print-plain print-break-avoid">
            <CardHeader title="الخدمات" />
            {services.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>الخدمة</Th>
                    <Th className="text-end">السعر</Th>
                    <Th className="no-print">أضافها</Th>
                    {canEdit ? <Th className="no-print w-10"><span className="sr-only">إجراءات</span></Th> : null}
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className={cn(s.cancelled && "text-muted-foreground")}>
                      <Td>
                        <span className={cn(s.cancelled && "line-through")}>{s.name}</span>
                        {s.cancelled ? (
                          <span className="ms-2 no-print">
                            <CancelledBadge reason={s.cancelReason} />
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-end">
                        {canEdit && !s.cancelled ? (
                          <PriceEditor
                            value={s.price}
                            label={s.name}
                            onSave={(price) => run(`price-${s.id}`, () => visitsService.updateService(visit.id, s.id, price), "تم تعديل السعر")}
                          />
                        ) : (
                          <Money value={s.price} currency={currency} plain className={cn(s.cancelled && "line-through")} />
                        )}
                      </Td>
                      <Td className="no-print text-xs text-muted-foreground">{s.addedByName}</Td>
                      {canEdit ? (
                        <Td className="no-print">
                          {!s.cancelled ? (
                            <Button variant="ghost" size="icon" aria-label={`إلغاء ${s.name}`} title="إلغاء الخدمة" onClick={() => setCancelService(s.id)}>
                              <X className="text-muted-foreground" />
                            </Button>
                          ) : null}
                        </Td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="لا توجد خدمات بعد" description="أضف الخدمات بعد خروج المريض من الطبيب." className="py-8" />
            )}
            {canEdit ? (
              <div className="no-print border-t border-border p-4">
                <AddServiceRow
                  services={lookups?.services.filter((s) => s.active) ?? []}
                  currency={currency}
                  onAdd={(serviceId, price) => run("add-service", () => visitsService.addService(visit.id, serviceId, price), "تمت إضافة الخدمة")}
                />
              </div>
            ) : null}
          </Card>

          {/* الدفعات */}
          <Card className="print-plain print-break-avoid">
            <CardHeader title="الدفعات" />
            {payments.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>التاريخ</Th>
                    <Th className="text-end">المبلغ</Th>
                    <Th>طريقة الدفع</Th>
                    <Th>رقم السند</Th>
                    <Th className="no-print">المسجل</Th>
                    {canCancelPay ? <Th className="no-print w-10"><span className="sr-only">إجراءات</span></Th> : null}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className={cn(p.cancelled && "text-muted-foreground")}>
                      <Td className="text-xs whitespace-nowrap">
                        <Num value={formatDateTime(p.createdAt)} />
                      </Td>
                      <Td className="text-end font-medium">
                        <Money value={p.amount} currency={currency} plain className={cn(p.cancelled && "line-through")} />
                        {p.cancelled ? (
                          <span className="ms-2 no-print">
                            <CancelledBadge reason={p.cancelReason} />
                          </span>
                        ) : null}
                      </Td>
                      <Td>{p.methodName}</Td>
                      <Td>{p.receiptNo ? <Num value={p.receiptNo} /> : "—"}</Td>
                      <Td className="no-print text-xs text-muted-foreground">{p.createdByName}</Td>
                      {canCancelPay ? (
                        <Td className="no-print">
                          {!p.cancelled ? (
                            <Button variant="ghost" size="icon" aria-label="إلغاء الدفعة" title="إلغاء الدفعة" onClick={() => setCancelPayment(p.id)}>
                              <X className="text-muted-foreground" />
                            </Button>
                          ) : null}
                        </Td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="لا توجد دفعات" className="py-8" />
            )}
            {canPay ? (
              <div className="no-print border-t border-border p-4">
                <AddPaymentRow
                  key={totals.remaining}
                  remaining={totals.remaining}
                  currency={currency}
                  methods={lookups?.paymentMethods.filter((m) => m.active) ?? []}
                  onAdd={(input) => run("pay", () => visitsService.addPayment(visit.id, input), "تم تسجيل الدفعة")}
                />
              </div>
            ) : status === "scheduled" ? (
              <p className="no-print border-t border-border px-4 py-3 text-sm text-muted-foreground">سجّل حضور المريض أولًا لإضافة دفعة.</p>
            ) : null}
          </Card>
        </div>

        {/* الحساب */}
        <div className="space-y-5">
          <Card className="print-plain print-break-avoid">
            <CardHeader title="الحساب" />
            <dl className="divide-y divide-border text-sm">
              <Row label="إجمالي الخدمات" value={<Money value={totals.services} currency={currency} />} />
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">الخصم</dt>
                  <dd className="font-medium">
                    {totals.discount > 0 ? <Money value={totals.discount} currency={currency} /> : "—"}
                  </dd>
                </div>
                {canEdit && totals.services > 0 ? (
                  <DiscountEditor
                    total={totals.services}
                    current={totals.discount}
                    currency={currency}
                    onApply={(value, type) => run("discount", () => visitsService.setDiscount(visit.id, value, type), "تم تطبيق الخصم")}
                  />
                ) : null}
              </div>
              <Row label="الإجمالي النهائي" value={<Money value={totals.total} currency={currency} />} strong />
              <Row label="المدفوع" value={<Money value={totals.paid} currency={currency} />} className="text-settled" />
              <Row
                label="المتبقي"
                value={<Money value={totals.remaining} currency={currency} />}
                strong
                className={totals.remaining > 0 ? "text-debt" : totals.remaining < 0 ? "text-credit" : "text-settled"}
              />
            </dl>
          </Card>

          <Card className="no-print p-4 text-xs text-muted-foreground">
            <p>سجّلها: {data.createdByName}</p>
            <p className="mt-1">
              الإنشاء: <Num value={formatDateTime(visit.createdAt)} />
            </p>
            {visit.checkedInAt ? (
              <p className="mt-1">
                الحضور: <Num value={formatDateTime(visit.checkedInAt)} />
              </p>
            ) : null}
            {visit.closedAt ? (
              <p className="mt-1">
                الإغلاق: <Num value={formatDateTime(visit.closedAt)} />
              </p>
            ) : null}
          </Card>
        </div>
      </div>

      <p className="print-only mt-6 text-xs">المسجل: {data.createdByName}</p>

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="إغلاق الزيارة؟"
        description={
          totals.remaining > 0
            ? `المتبقي ${formatMoney(totals.remaining, currency)} بيبقى دينًا على المريض. بعد الإغلاق التعديل للمدير فقط.`
            : "تمت المحاسبة بالكامل. بعد الإغلاق التعديل للمدير فقط."
        }
        confirmLabel="إغلاق الزيارة"
        onConfirm={() => run("close", () => visitsService.close(visit.id), "تم إغلاق الزيارة").then(() => undefined)}
      />
      <CancelWithReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="إلغاء الزيارة"
        confirmLabel="إلغاء الزيارة"
        onConfirm={async (reason) => {
          await run("cancel", () => visitsService.cancel(visit.id, reason), "تم إلغاء الزيارة");
        }}
      />
      <CancelWithReasonDialog
        open={!!cancelService}
        onOpenChange={(v) => !v && setCancelService(null)}
        title="إلغاء الخدمة"
        confirmLabel="إلغاء الخدمة"
        onConfirm={async (reason) => {
          await run("cancel-service", () => visitsService.cancelService(visit.id, cancelService!, reason), "تم إلغاء الخدمة");
        }}
      />
      <CancelWithReasonDialog
        open={!!cancelPayment}
        onOpenChange={(v) => !v && setCancelPayment(null)}
        title="إلغاء الدفعة"
        confirmLabel="إلغاء الدفعة"
        onConfirm={async (reason) => {
          await visitsService.cancelPayment(cancelPayment!, reason);
          toast.success("تم إلغاء الدفعة");
          bump();
        }}
      />
    </div>
  );
}

function Row({ label, value, strong, className }: { label: string; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(strong ? "text-base font-bold" : "font-medium", className)}>{value}</dd>
    </div>
  );
}

function PriceEditor({ value, label, onSave }: { value: number; label: string; onSave: (price: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));
  const [busy, setBusy] = useState(false);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setV(String(value));
          setEditing(true);
        }}
        className="group inline-flex items-center gap-1.5 rounded px-1 hover:bg-muted"
        aria-label={`تعديل سعر ${label}`}
      >
        <Money value={value} plain />
        <Pencil className="no-print size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </button>
    );
  }
  const save = async () => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return;
    if (n === value) return setEditing(false);
    setBusy(true);
    try {
      await onSave(n);
      setEditing(false);
    } catch {
      /* الرسالة ظهرت */
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-28">
        <MoneyInput
          autoFocus
          aria-label={`سعر ${label}`}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-8"
        />
      </span>
      <Button size="icon" variant="ghost" className="size-8" loading={busy} onClick={save} aria-label="حفظ السعر">
        {!busy ? <Check /> : null}
      </Button>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(false)} aria-label="تراجع">
        <X />
      </Button>
    </span>
  );
}

function AddServiceRow({
  services,
  currency,
  onAdd,
}: {
  services: { id: string; name: string; defaultPrice: number }[];
  currency: VisitDetails["visit"]["currency"];
  onAdd: (serviceId: string, price: number) => Promise<void>;
}) {
  const [serviceId, setServiceId] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="إضافة خدمة" htmlFor="add-svc" className="min-w-48 flex-1">
        <Select
          id="add-svc"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            const s = services.find((x) => x.id === e.target.value);
            setPrice(s ? String(s.defaultPrice) : "");
          }}
        >
          <option value="">اختر الخدمة</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatMoney(s.defaultPrice, currency)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="السعر" htmlFor="add-svc-price" className="w-32">
        <MoneyInput id="add-svc-price" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Button
        variant="secondary"
        disabled={!serviceId}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onAdd(serviceId, Number(price) || 0);
            setServiceId("");
            setPrice("");
          } catch {
            /* الرسالة ظهرت */
          } finally {
            setBusy(false);
          }
        }}
      >
        <Plus /> إضافة خدمة
      </Button>
    </div>
  );
}

function AddPaymentRow({
  remaining,
  currency,
  methods,
  onAdd,
}: {
  remaining: number;
  currency: VisitDetails["visit"]["currency"];
  methods: { id: string; name: string }[];
  onAdd: (input: { amount: number; methodId: string; receiptNo: string | null }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="المبلغ" htmlFor="pay-amount" className="w-36">
          <MoneyInput id="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!err} />
        </Field>
        <Field label="طريقة الدفع" htmlFor="pay-method" className="w-40">
          <Select id="pay-method" value={methodId || methods[0]?.id} onChange={(e) => setMethodId(e.target.value)}>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="رقم السند" htmlFor="pay-receipt" className="w-28">
          <Input id="pay-receipt" dir="ltr" className="num text-start" value={receipt} onChange={(e) => setReceipt(toLatinDigits(e.target.value))} />
        </Field>
        <Button
          loading={busy}
          onClick={async () => {
            const n = Number(amount);
            if (!(n > 0)) return setErr("أدخل مبلغًا أكبر من صفر");
            setErr(null);
            setBusy(true);
            try {
              await onAdd({ amount: n, methodId: methodId || methods[0]?.id, receiptNo: receipt || null });
              setAmount("");
              setReceipt("");
            } catch {
              /* الرسالة ظهرت */
            } finally {
              setBusy(false);
            }
          }}
        >
          <Plus /> إضافة دفعة
        </Button>
      </div>
      {err ? <p className="text-xs text-debt">{err}</p> : null}
      {remaining > 0 ? (
        <p className="text-xs text-muted-foreground">
          المتبقي على الزيارة: <Money value={remaining} currency={currency} /> — {CURRENCY_LABEL[currency]}
        </p>
      ) : null}
    </div>
  );
}

function DiscountEditor({
  total,
  current,
  currency,
  onApply,
}: {
  total: number;
  current: number;
  currency: VisitDetails["visit"]["currency"];
  onApply: (value: number, type: "amount" | "percent") => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(value) || 0;
  const preview = type === "percent" ? Math.round((total * Math.min(n, 100)) / 100) : Math.min(n, total);
  const invalid = type === "percent" ? n > 100 : n > total;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="no-print mt-1 text-xs font-medium text-primary hover:underline">
        {current > 0 ? "تعديل الخصم" : "إضافة خصم"}
      </button>
    );
  }
  return (
    <div className="no-print mt-2 space-y-2 rounded-lg bg-muted/60 p-2.5">
      <div className="flex gap-1 rounded-md bg-surface p-0.5" role="radiogroup" aria-label="نوع الخصم">
        {(["amount", "percent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn("h-7 flex-1 rounded text-xs font-medium", type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {t === "amount" ? "مبلغ" : "نسبة %"}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <MoneyInput autoFocus aria-label="قيمة الخصم" value={value} onChange={(e) => setValue(e.target.value)} className="h-9" aria-invalid={invalid} suffix={type === "percent" ? "%" : undefined} />
        <Button
          size="sm"
          loading={busy}
          disabled={invalid || value === ""}
          onClick={async () => {
            setBusy(true);
            try {
              await onApply(n, type);
              setOpen(false);
              setValue("");
            } catch {
              /* الرسالة ظهرت */
            } finally {
              setBusy(false);
            }
          }}
        >
          تطبيق
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          تراجع
        </Button>
      </div>
      <p className={cn("text-xs", invalid ? "text-debt" : "text-muted-foreground")}>
        {invalid ? (type === "percent" ? "النسبة لا تتجاوز 100%" : "الخصم أكبر من إجمالي الخدمات") : <>الخصم = {formatMoney(preview, currency)} (ضع 0 لإزالته)</>}
      </p>
    </div>
  );
}
