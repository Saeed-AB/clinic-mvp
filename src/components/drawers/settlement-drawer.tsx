"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { BalanceBadge, indicatorText } from "@/components/shared/badges";
import { Money } from "@/components/shared/money";
import { MoneyInput } from "@/components/shared/money-input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { balanceIndicator } from "@/lib/domain/balance";
import { formKeyHandler } from "@/lib/form-keys";
import { CURRENCY_LABEL, formatMoney, toLatinDigits } from "@/lib/format/money";
import { patientsService } from "@/lib/services/patients";
import type { PatientSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { UnsavedGuard } from "./unsaved-guard";

export function SettlementDrawer() {
  const { open, payload, close, bump } = useDrawers();
  const isOpen = open === "settlement";
  const lookups = useLookups((s) => s.data);
  const loadLookups = useLookups((s) => s.load);

  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [guard, setGuard] = useState(false);

  const currency = lookups?.clinic.currency ?? "YER";
  const methods = lookups?.paymentMethods.filter((m) => m.active) ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setPatient(null);
    setAmount("");
    setReceiptNo("");
    setNote("");
    setErrors({});
    setServerError(null);
    loadLookups().then((l) => setMethodId(l?.paymentMethods.find((m) => m.active)?.id ?? ""));
    if (payload.patientId) {
      patientsService
        .get(payload.patientId)
        .then((p) => {
          setPatient(p);
          if (p.balance > 0) setAmount(String(p.balance));
        })
        .catch((e) => setServerError(errorMessage(e)));
    }
  }, [isOpen, payload.patientId, loadLookups]);

  const value = Number(amount) || 0;
  const after = (patient?.balance ?? 0) - value;
  const over = patient ? value > Math.max(patient.balance, 0) : false;
  const dirty = !!patient && (amount !== String(Math.max(patient.balance, 0)) || !!receiptNo || !!note);

  async function save() {
    const e: Record<string, string> = {};
    if (!(value > 0)) e.amount = "أدخل المبلغ المدفوع";
    if (!methodId) e.methodId = "اختر طريقة الدفع";
    setErrors(e);
    if (Object.keys(e).length || !patient) return;
    setSaving(true);
    setServerError(null);
    try {
      const updated = await patientsService.settle(patient.id, { amount: value, methodId, receiptNo: receiptNo || null, note: note || null });
      bump();
      close();
      if (updated.balance <= 0 && patient.balance > 0) {
        toast.success(`تم تسجيل السداد — ${updated.name} صار ${updated.balance < 0 ? "له رصيد" : "خالصًا"}`);
      } else {
        toast.success(`تم تسجيل سداد ${formatMoney(value, currency)}`, { description: `الرصيد الحالي: ${formatMoney(updated.balance, currency)}` });
      }
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(v) => {
          if (v) return;
          if (dirty) setGuard(true);
          else close();
        }}
        title="تسجيل سداد"
        description="سداد على الرصيد العام للمريض"
        footer={
          <Button className="w-full" size="lg" loading={saving} disabled={!patient} onClick={save}>
            حفظ السداد
          </Button>
        }
      >
        <form noValidate onKeyDown={formKeyHandler(save)} onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {serverError ? (
            <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2.5 text-sm text-debt">
              {serverError}
            </p>
          ) : null}

          {patient ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="font-medium">{patient.name}</p>
              <p className="text-xs text-muted-foreground">
                ملف <span className="num">{patient.fileNumber}</span>
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الرصيد الحالي</span>
                <span className="flex items-center gap-2">
                  <Money value={Math.abs(patient.balance)} currency={currency} className={cn("text-lg font-bold", indicatorText[patient.indicator])} />
                  <BalanceBadge indicator={patient.indicator} />
                </span>
              </div>
            </div>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}

          <Field label="المبلغ المدفوع" htmlFor="s-amount" required error={errors.amount}>
            <MoneyInput id="s-amount" autoFocus value={amount} suffix={CURRENCY_LABEL[currency]} aria-invalid={!!errors.amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">الرصيد بعد السداد</span>
            <Money value={Math.abs(after)} currency={currency} className={cn("font-semibold", indicatorText[balanceIndicator(after)])} />
          </div>

          {over && value > 0 ? (
            <p role="status" className="flex items-start gap-1.5 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              المبلغ أكبر من الدين. بعد الحفظ يصير للمريض رصيد دائن {formatMoney(-after, currency)}.
            </p>
          ) : null}

          <Field label="طريقة الدفع" htmlFor="s-method" required error={errors.methodId}>
            <Select id="s-method" value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="رقم السند (اختياري)" htmlFor="s-receipt">
            <Input id="s-receipt" dir="ltr" className="num text-start" value={receiptNo} onChange={(e) => setReceiptNo(toLatinDigits(e.target.value))} />
          </Field>
          <Field label="ملاحظات (اختياري)" htmlFor="s-note">
            <Textarea id="s-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </form>
      </Sheet>
      <UnsavedGuard open={guard} onOpenChange={setGuard} onDiscard={close} />
    </>
  );
}
