"use client";

import { AlertTriangle, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { BalanceBadge } from "@/components/shared/badges";
import { Money } from "@/components/shared/money";
import { MoneyInput } from "@/components/shared/money-input";
import { errorMessage } from "@/lib/api/client";
import { formKeyHandler } from "@/lib/form-keys";
import { addDays, formatWeekday, todayAden } from "@/lib/format/date";
import { CURRENCY_LABEL, formatMoney, toLatinDigits } from "@/lib/format/money";
import { patientSchema } from "@/lib/schemas";
import { patientsService } from "@/lib/services/patients";
import { visitsService } from "@/lib/services/visits";
import type { PatientSummary } from "@/lib/types";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { GenderField } from "./gender-field";
import { UnsavedGuard } from "./unsaved-guard";

interface Line {
  key: string;
  serviceId: string;
  name: string;
  price: string;
}

let lineSeq = 0;
const newKey = () => `l${++lineSeq}`;

export function VisitDrawer() {
  const router = useRouter();
  const { open, payload, close, bump } = useDrawers();
  const isOpen = open === "visit";
  const lookups = useLookups((s) => s.data);
  const loadLookups = useLookups((s) => s.load);

  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [quickNew, setQuickNew] = useState(false);
  const [np, setNp] = useState({ name: "", gender: "" as "" | "male" | "female", phone: "", age: "" });
  const [date, setDate] = useState(todayAden());
  const [doctorId, setDoctorId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [addServiceId, setAddServiceId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payReceipt, setPayReceipt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [guard, setGuard] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = todayAden();
  const isToday = date === today;
  const currency = lookups?.clinic.currency ?? "YER";
  const activeDoctors = lookups?.doctors.filter((d) => d.active) ?? [];
  const activeServices = lookups?.services.filter((s) => s.active) ?? [];
  const activeMethods = lookups?.paymentMethods.filter((m) => m.active) ?? [];

  // تهيئة عند الفتح
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setResults(null);
    setQuickNew(false);
    setNp({ name: "", gender: "", phone: "", age: "" });
    setDate(todayAden());
    setPayAmount("");
    setPayReceipt("");
    setErrors({});
    setServerError(null);
    setDirty(false);
    setPatient(null);
    loadLookups(true).then((l) => {
      if (!l) return;
      const docs = l.doctors.filter((d) => d.active);
      setDoctorId(docs.length === 1 ? docs[0].id : "");
      setPayMethod(l.paymentMethods.find((m) => m.active)?.id ?? "");
      const entry = l.services.find((s) => s.isEntryFee && s.active);
      setLines(entry ? [{ key: newKey(), serviceId: entry.id, name: entry.name, price: String(entry.defaultPrice) }] : []);
    });
    if (payload.patientId) {
      patientsService.get(payload.patientId).then(setPatient).catch((e) => setServerError(errorMessage(e)));
    } else {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen, payload.patientId, loadLookups]);

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.price) || 0), 0), [lines]);

  async function runSearch() {
    const q = toLatinDigits(query).trim();
    if (!q) return;
    setSearching(true);
    try {
      const r = await patientsService.search(q);
      const list = [...(r.byFileNumber ? [r.byFileNumber] : []), ...r.byPhone.filter((p) => p.id !== r.byFileNumber?.id)];
      setResults(list);
      if (list.length === 1) pickPatient(list[0]);
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  }

  function pickPatient(p: PatientSummary) {
    setPatient(p);
    setQuickNew(false);
    setDirty(true);
    setErrors((e) => ({ ...e, patient: "" }));
  }

  function addLine(serviceId: string) {
    const s = activeServices.find((x) => x.id === serviceId);
    if (!s) return;
    setLines((ls) => [...ls, { key: newKey(), serviceId: s.id, name: s.name, price: String(s.defaultPrice) }]);
    setAddServiceId("");
    setDirty(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!patient && !quickNew) e.patient = "اختر المريض أو أضف مريضًا جديدًا";
    if (quickNew) {
      const r = patientSchema.safeParse({ name: np.name, gender: np.gender || undefined, phone: np.phone, age: np.age });
      if (!r.success) {
        for (const issue of r.error.issues) {
          const k = `np.${String(issue.path[0])}`;
          if (!e[k]) e[k] = issue.message;
        }
      }
    }
    if (!doctorId) e.doctorId = "اختر الطبيب";
    if (date < today) e.date = "لا يمكن اختيار تاريخ سابق";
    const amount = Number(payAmount || 0);
    if (isToday && amount > 0 && !payMethod) e.payMethod = "اختر طريقة الدفع";
    setErrors(e);
    return Object.values(e).filter(Boolean).length === 0;
  }

  async function save() {
    setServerError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const amount = Number(payAmount || 0);
      const v = await visitsService.create({
        patientId: patient?.id ?? null,
        newPatient: quickNew
          ? patientSchema.parse({ name: np.name, gender: np.gender || undefined, phone: np.phone, age: np.age })
          : null,
        date,
        doctorId,
        services: lines.map((l) => ({ serviceId: l.serviceId, price: Number(l.price) || 0 })),
        payment: isToday && amount > 0 ? { amount, methodId: payMethod, receiptNo: payReceipt || null } : null,
      });
      bump();
      setDirty(false);
      close();
      toast.success(v.visit.status === "open" ? `تم تسجيل حضور ${v.patient.name}` : `تمت جدولة زيارة ${v.patient.name}`, {
        description: quickNew ? `رقم الملف الجديد: ${v.patient.fileNumber}` : undefined,
        action: { label: "فتح تفاصيل الزيارة", onClick: () => router.push(`/visits/${v.visit.id}`) },
        duration: 8000,
      });
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function requestClose(v: boolean) {
    if (v) return;
    if (dirty) setGuard(true);
    else close();
  }

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={requestClose}
        title="زيارة جديدة"
        description="تسجيل حضور مريض أو جدولة زيارة"
        footer={
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">إجمالي الخدمات</p>
              <p className="text-lg font-bold">
                <Money value={total} currency={currency} />
              </p>
            </div>
            <Button size="lg" loading={saving} onClick={save}>
              {isToday ? "تسجيل الحضور" : "جدولة الزيارة"}
            </Button>
          </div>
        }
      >
        <form noValidate onKeyDown={formKeyHandler(save)} onSubmit={(e) => e.preventDefault()} onChange={() => setDirty(true)} className="space-y-5">
          {serverError ? (
            <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2.5 text-sm text-debt">
              {serverError}
            </p>
          ) : null}

          {/* 1. المريض */}
          <section aria-labelledby="v-patient" className="space-y-2">
            <h3 id="v-patient" className="text-sm font-semibold">
              1. المريض <span className="text-debt">*</span>
            </h3>
            {patient ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ملف <span className="num">{patient.fileNumber}</span>
                      {patient.phone ? (
                        <>
                          {" "}· <span className="num">{patient.phone}</span>
                        </>
                      ) : null}
                      {patient.age != null ? ` · ${patient.age} سنة` : ""}
                    </p>
                  </div>
                  {!payload.patientId ? (
                    <Button variant="ghost" size="sm" onClick={() => setPatient(null)}>
                      تغيير
                    </Button>
                  ) : null}
                </div>
                {patient.balance > 0 ? (
                  <p role="alert" className="mt-2 flex items-center gap-1.5 rounded-md bg-debt-soft px-2.5 py-2 text-sm font-medium text-debt">
                    <AlertTriangle className="size-4 shrink-0" />
                    على المريض رصيد سابق: {formatMoney(patient.balance, currency)}
                  </p>
                ) : patient.balance < 0 ? (
                  <p className="mt-2 text-sm text-credit">للمريض رصيد دائن: {formatMoney(-patient.balance, currency)}</p>
                ) : null}
              </div>
            ) : quickNew ? (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary-soft/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">مريض جديد (ينحفظ مع الزيارة)</p>
                  <Button variant="ghost" size="sm" onClick={() => setQuickNew(false)}>
                    <X /> إلغاء
                  </Button>
                </div>
                <Field label="الاسم الرباعي" htmlFor="np-name" required error={errors["np.name"]}>
                  <Input id="np-name" autoFocus value={np.name} aria-invalid={!!errors["np.name"]} onChange={(e) => setNp({ ...np, name: e.target.value })} />
                </Field>
                <Field label="الجنس" required error={errors["np.gender"]}>
                  <GenderField value={np.gender} onChange={(g) => setNp({ ...np, gender: g })} invalid={!!errors["np.gender"]} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="الجوال" htmlFor="np-phone" error={errors["np.phone"]}>
                    <Input id="np-phone" type="tel" dir="ltr" className="num text-start" value={np.phone} onChange={(e) => setNp({ ...np, phone: toLatinDigits(e.target.value) })} />
                  </Field>
                  <Field label="العمر" htmlFor="np-age" error={errors["np.age"]}>
                    <Input id="np-age" inputMode="numeric" dir="ltr" className="num text-start" value={np.age} onChange={(e) => setNp({ ...np, age: toLatinDigits(e.target.value).replace(/[^\d]/g, "") })} />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      ref={searchRef}
                      type="search"
                      inputMode="numeric"
                      aria-label="البحث عن المريض برقم الملف أو الجوال"
                      placeholder="رقم الملف أو الجوال"
                      className="ps-9"
                      value={query}
                      aria-invalid={!!errors.patient}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          runSearch();
                        }
                      }}
                    />
                  </div>
                  <Button variant="outline" onClick={runSearch} loading={searching}>
                    بحث
                  </Button>
                </div>
                {errors.patient ? <p className="text-xs text-debt">{errors.patient}</p> : null}
                {results && results.length > 1 ? (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border" aria-label="نتائج البحث">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => pickPatient(p)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start hover:bg-muted">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ملف <span className="num">{p.fileNumber}</span>
                              {p.age != null ? ` · ${p.age} سنة` : ""}
                            </span>
                          </span>
                          <BalanceBadge indicator={p.indicator} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {results && results.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد مريض بهذا الرقم.</p> : null}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setQuickNew(true);
                    const digits = toLatinDigits(query).replace(/[^\d]/g, "");
                    if (digits.length >= 7) setNp((n) => ({ ...n, phone: digits }));
                  }}
                >
                  <UserPlus /> مريض جديد
                </Button>
              </div>
            )}
          </section>

          {/* 2. التاريخ + 3. الطبيب */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="2. التاريخ" htmlFor="v-date" error={errors.date} hint={isToday ? "اليوم — تُسجل كزيارة مفتوحة" : `${formatWeekday(date)} — تُسجل كزيارة مجدولة`}>
              <div className="flex gap-1.5">
                <Input id="v-date" type="date" min={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="flex-1" />
                <Button variant="outline" size="sm" className="h-10 max-sm:h-11" onClick={() => setDate(isToday ? addDays(today, 1) : today)}>
                  {isToday ? "غدًا" : "اليوم"}
                </Button>
              </div>
            </Field>
            <Field label="3. الطبيب" htmlFor="v-doctor" required error={errors.doctorId}>
              <Select id="v-doctor" value={doctorId} aria-invalid={!!errors.doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">اختر الطبيب</option>
                {activeDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* 4. الخدمات */}
          <section aria-labelledby="v-services" className="space-y-2">
            <h3 id="v-services" className="text-sm font-semibold">
              4. الخدمات
            </h3>
            {lines.length ? (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={l.key} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{l.name}</span>
                    <div className="w-32">
                      <MoneyInput
                        aria-label={`سعر ${l.name}`}
                        value={l.price}
                        onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, price: e.target.value } : x)))}
                      />
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`حذف ${l.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد خدمات بعد. يمكن إضافتها الآن أو لاحقًا بعد خروج المريض من الطبيب.</p>
            )}
            <div className="flex gap-2">
              <Select aria-label="إضافة خدمة" value={addServiceId} onChange={(e) => addLine(e.target.value)} className="flex-1">
                <option value="">+ إضافة خدمة</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatMoney(s.defaultPrice, currency)}
                  </option>
                ))}
              </Select>
            </div>
          </section>

          {/* 5. الدفع */}
          <section aria-labelledby="v-pay" className="space-y-3">
            <h3 id="v-pay" className="text-sm font-semibold">
              5. الدفع <span className="font-normal text-muted-foreground">(اختياري)</span>
            </h3>
            {isToday ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="المبلغ المدفوع" htmlFor="v-amount">
                    <MoneyInput id="v-amount" value={payAmount} suffix={CURRENCY_LABEL[currency]} onChange={(e) => setPayAmount(e.target.value)} />
                  </Field>
                  <Field label="طريقة الدفع" htmlFor="v-method" error={errors.payMethod}>
                    <Select id="v-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      {activeMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="flex items-end gap-3">
                  <Field label="رقم السند (اختياري)" htmlFor="v-receipt" className="flex-1">
                    <Input id="v-receipt" dir="ltr" className="num text-start" value={payReceipt} onChange={(e) => setPayReceipt(toLatinDigits(e.target.value))} />
                  </Field>
                  {total > 0 ? (
                    <Button variant="outline" className="mb-0" onClick={() => setPayAmount(String(total))}>
                      <Plus /> المبلغ كاملًا
                    </Button>
                  ) : null}
                </div>
                {Number(payAmount) > 0 && total > Number(payAmount) ? (
                  <p className="text-sm text-muted-foreground">
                    المتبقي على الزيارة: <Money value={total - Number(payAmount)} currency={currency} className="font-medium text-debt" />
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">الدفع يكون عند حضور المريض في يوم الموعد.</p>
            )}
          </section>

          {!patient && !quickNew ? null : (
            <p className="text-xs text-muted-foreground">
              <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">Enter</kbd> للحفظ
            </p>
          )}
        </form>
      </Sheet>
      <UnsavedGuard open={guard} onOpenChange={setGuard} onDiscard={close} />
    </>
  );
}
