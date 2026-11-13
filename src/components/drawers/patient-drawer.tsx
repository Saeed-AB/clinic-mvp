"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CalendarPlus, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/money";
import { errorMessage } from "@/lib/api/client";
import { formKeyHandler } from "@/lib/form-keys";
import { toLatinDigits } from "@/lib/format/money";
import { patientSchema, type PatientForm } from "@/lib/schemas";
import { patientsService } from "@/lib/services/patients";
import type { PatientSummary } from "@/lib/types";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { useCan } from "@/stores/session";
import { GenderField } from "./gender-field";
import { UnsavedGuard } from "./unsaved-guard";

const EMPTY: PatientForm = { name: "", gender: undefined as unknown as "male", age: "" as unknown as number, phone: "", area: "", notes: "", fileNumber: null };

export function PatientDrawer() {
  const { open, payload, close, openDrawer, bump } = useDrawers();
  const isOpen = open === "patient";
  const editId = payload.editPatientId;
  const lookups = useLookups((s) => s.data);
  const loadLookups = useLookups((s) => s.load);
  const canEditFileNo = useCan("patient.editFileNumber");

  const [saved, setSaved] = useState<PatientSummary | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phoneMatches, setPhoneMatches] = useState<PatientSummary[]>([]);
  const [fileTaken, setFileTaken] = useState(false);
  const [guard, setGuard] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editing, setEditing] = useState<PatientSummary | null>(null);

  const form = useForm<PatientForm>({ resolver: zodResolver(patientSchema), mode: "onTouched", defaultValues: EMPTY });
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  // تجهيز النافذة عند الفتح
  useEffect(() => {
    if (!isOpen) return;
    setSaved(null);
    setServerError(null);
    setPhoneMatches([]);
    setFileTaken(false);
    setEditing(null);
    if (editId) {
      setLoadingEdit(true);
      patientsService
        .get(editId)
        .then((p) => {
          setEditing(p);
          reset({ name: p.name, gender: p.gender, age: p.age ?? ("" as unknown as number), phone: p.phone ?? "", area: p.area ?? "", notes: p.notes ?? "", fileNumber: p.fileNumber });
        })
        .catch((e) => setServerError(errorMessage(e)))
        .finally(() => setLoadingEdit(false));
    } else {
      loadLookups(true).then((l) => reset({ ...EMPTY, phone: payload.phone ?? "", fileNumber: l?.nextFileNumber ?? null }));
    }
  }, [isOpen, editId, payload.phone, reset, loadLookups]);

  async function checkPhone(raw: string) {
    const phone = toLatinDigits(raw).replace(/[^\d]/g, "");
    if (phone.length < 6) return setPhoneMatches([]);
    try {
      const list = await patientsService.byPhone(phone);
      setPhoneMatches(list.filter((p) => p.id !== editId));
    } catch {
      setPhoneMatches([]);
    }
  }

  async function checkFile(raw: string) {
    const n = Number(toLatinDigits(raw));
    if (!Number.isInteger(n) || n <= 0) return setFileTaken(false);
    try {
      const r = await patientsService.checkFileNumber(n, editId);
      setFileTaken(r.taken);
    } catch {
      setFileTaken(false);
    }
  }

  const submit = (andVisit: boolean) =>
    handleSubmit(async (values) => {
      setServerError(null);
      if (fileTaken) return;
      const input = patientSchema.parse(values);
      try {
        if (editId) {
          await patientsService.update(editId, input);
          toast.success("تم حفظ بيانات المريض");
          bump();
          close();
          return;
        }
        // رقم الملف يُرسل فقط إذا عدّله المدير
        const fileNumber = input.fileNumber && input.fileNumber !== lookups?.nextFileNumber ? input.fileNumber : null;
        const p = await patientsService.create({ ...input, fileNumber });
        bump();
        reset(values);
        if (andVisit) {
          toast.success(`تم حفظ المريض — رقم الملف ${p.fileNumber}`);
          openDrawer("visit", { patientId: p.id });
        } else {
          setSaved(p);
        }
      } catch (e) {
        setServerError(errorMessage(e));
      }
    });

  function requestClose(v: boolean) {
    if (v) return;
    if (isDirty && !saved) setGuard(true);
    else close();
  }

  const title = editId ? "تعديل بيانات المريض" : "مريض جديد";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={requestClose}>
        <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{editId ? editing?.name : "الحقول المطلوبة: الاسم الرباعي والجنس فقط"}</SheetDescription>
        </SheetHeader>
        <SheetBody>
        {saved ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 rounded-full bg-settled-soft p-3 text-settled">
              <Check className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground">تم حفظ المريض. أعطه رقم ملفه:</p>
            <p className="num my-3 text-5xl font-bold tracking-wide text-primary">{saved.fileNumber}</p>
            <p className="font-medium">{saved.name}</p>
            <div className="mt-6 grid w-full gap-2">
              <Button onClick={() => openDrawer("visit", { patientId: saved.id })}>
                <CalendarPlus /> تسجيل زيارة له
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(String(saved.fileNumber));
                  toast.success("تم نسخ رقم الملف");
                }}
              >
                <Copy /> نسخ رقم الملف
              </Button>
              <Link href={`/patients/${saved.id}`} onClick={close} className="py-2 text-sm text-primary hover:underline">
                فتح ملف المريض
              </Link>
            </div>
          </div>
        ) : (
          <form noValidate onKeyDown={formKeyHandler(() => submit(false)())} onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {serverError ? (
              <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2.5 text-sm text-debt">
                {serverError}
              </p>
            ) : null}

            <Field label="الاسم الرباعي" htmlFor="p-name" required error={errors.name?.message}>
              <Input id="p-name" autoFocus aria-invalid={!!errors.name} placeholder="مثال: محمد أحمد علي الحميري" {...register("name")} />
            </Field>

            <Field label="الجنس" required error={errors.gender?.message}>
              <Controller control={control} name="gender" render={({ field }) => <GenderField value={field.value} onChange={field.onChange} invalid={!!errors.gender} />} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="العمر" htmlFor="p-age" error={errors.age?.message}>
                <Input id="p-age" inputMode="numeric" dir="ltr" className="num text-start" aria-invalid={!!errors.age} {...register("age", { setValueAs: (v) => toLatinDigits(String(v ?? "")) })} />
              </Field>
              <Field label="رقم الملف" htmlFor="p-file" error={errors.fileNumber?.message ?? (fileTaken ? "رقم الملف مستخدم لمريض آخر" : undefined)} hint={canEditFileNo ? "تلقائي، ويمكنك تعديله" : "تلقائي"}>
                <Input
                  id="p-file"
                  inputMode="numeric"
                  dir="ltr"
                  className="num text-start"
                  readOnly={!canEditFileNo}
                  aria-invalid={!!errors.fileNumber || fileTaken}
                  {...register("fileNumber", { setValueAs: (v) => toLatinDigits(String(v ?? "")), onBlur: (e) => canEditFileNo && checkFile(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="الجوال" htmlFor="p-phone" error={errors.phone?.message}>
              <Input
                id="p-phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                className="num text-start"
                placeholder="7xxxxxxxx"
                aria-invalid={!!errors.phone}
                {...register("phone", { setValueAs: (v) => toLatinDigits(String(v ?? "")), onBlur: (e) => checkPhone(e.target.value) })}
              />
            </Field>

            {phoneMatches.length ? (
              <div role="status" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
                <p className="mb-2 flex items-center gap-1.5 font-medium text-warning">
                  <AlertTriangle className="size-4" /> هذا الجوال مسجل لمرضى آخرين (مسموح لأفراد العائلة)
                </p>
                <ul className="space-y-1">
                  {phoneMatches.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span>
                        <span className="num text-muted-foreground">#{p.fileNumber}</span> {p.name}
                      </span>
                      {p.balance > 0 ? <Money value={p.balance} className="text-xs text-debt" /> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Field label="المنطقة أو الحي" htmlFor="p-area">
              <Input id="p-area" {...register("area")} />
            </Field>
            <Field label="ملاحظات" htmlFor="p-notes">
              <Textarea id="p-notes" rows={2} {...register("notes")} />
            </Field>
            <p className="text-xs text-muted-foreground">
              اختصار: Enter للحقل التالي، و <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">Enter</kbd> للحفظ
            </p>
          </form>
        )}
        </SheetBody>
        {saved ? null : (
          <SheetFooter>
            {editId ? (
              <Button className="w-full" loading={isSubmitting} onClick={submit(false)} disabled={loadingEdit}>
                حفظ التعديلات
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button className="flex-1" loading={isSubmitting} onClick={submit(true)}>
                  <CalendarPlus /> حفظ وتسجيل زيارة
                </Button>
                <Button variant="outline" onClick={submit(false)} disabled={isSubmitting}>
                  حفظ
                </Button>
              </div>
            )}
          </SheetFooter>
        )}
        </SheetContent>
      </Sheet>
      <UnsavedGuard
        open={guard}
        onOpenChange={setGuard}
        onDiscard={() => {
          reset(EMPTY);
          close();
        }}
      />
    </>
  );
}
