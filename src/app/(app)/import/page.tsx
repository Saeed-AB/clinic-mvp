"use client";

import { CheckCircle2, Download, FileUp, Plus, Trash2, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Money, Num } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/states";
import { errorMessage } from "@/lib/api/client";
import { downloadImportTemplate, readSheet } from "@/lib/excel";
import { formatMoney, toLatinDigits } from "@/lib/format/money";
import { importsService } from "@/lib/services/imports";
import type { ImportRow, ImportValidation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";

type Mode = "quick" | "excel";
interface Draft {
  key: number;
  fileNumber: string;
  name: string;
  gender: string;
  age: string;
  phone: string;
  amount: string;
  note: string;
}

let seq = 0;
const blank = (): Draft => ({ key: ++seq, fileNumber: "", name: "", gender: "", age: "", phone: "", amount: "", note: "" });

function parseGender(v: unknown): "male" | "female" | "" {
  const s = String(v ?? "").trim().toLowerCase();
  if (["ذكر", "م", "male", "m", "ذ"].includes(s)) return "male";
  if (["أنثى", "انثى", "ف", "female", "f", "أ", "ا"].includes(s)) return "female";
  return "";
}

const num = (v: unknown): number | null => {
  const s = toLatinDigits(String(v ?? "")).replace(/[,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
/** المبلغ غير الصالح يُرسل -1 حتى يظهر سببه في المعاينة بدل رفض الطلب كاملًا */
const amountOf = (v: unknown): number => {
  const s = toLatinDigits(String(v ?? "")).replace(/[,\s]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : -1;
};

function draftToRow(d: Draft): ImportRow {
  return {
    fileNumber: num(d.fileNumber),
    name: d.name.trim(),
    gender: (d.gender || "x") as ImportRow["gender"],
    age: num(d.age),
    phone: toLatinDigits(d.phone).trim() || null,
    amount: amountOf(d.amount),
    note: d.note.trim() || null,
  };
}

export default function ImportPage() {
  const [mode, setMode] = useState<Mode>("quick");
  return (
    <div className="space-y-5">
      <PageHeader title="استيراد الأرصدة الافتتاحية" description="نقل المرضى والديون القديمة من الدفتر للنظام. كل سطر ينشئ مريضًا جديدًا ويضيف له رصيدًا افتتاحيًا." />
      <Tabs
        value={mode}
        onChange={setMode}
        items={[
          { value: "quick", label: "إدخال سريع" },
          { value: "excel", label: "ملف إكسل" },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        لمريض موجود مسبقًا، أضف الرصيد الافتتاحي من ملفه. إذا انكتب رقم الملف القديم ينحفظ كما هو، وإذا ما انكتب يعطيه النظام رقمًا تلقائيًا.
      </p>
      {mode === "quick" ? <QuickEntry /> : <ExcelImport />}
    </div>
  );
}

function ResultBanner({ result }: { result: { imported: number; total: number } }) {
  const currency = useLookups((s) => s.data?.clinic.currency);
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-settled/30 bg-settled-soft p-4">
      <p className="flex items-center gap-2 font-medium text-settled">
        <CheckCircle2 className="size-5" /> تم استيراد <Num value={result.imported} /> مريضًا بإجمالي {formatMoney(result.total, currency)}
      </p>
      <Link href="/debtors" className="text-sm font-medium text-primary hover:underline">
        عرضهم في المدينين
      </Link>
    </div>
  );
}

function QuickEntry() {
  const bump = useDrawers((s) => s.bump);
  const [rows, setRows] = useState<Draft[]>(() => [blank(), blank(), blank()]);
  const [errors, setErrors] = useState<Record<number, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);

  const filled = rows.filter((r) => r.name || r.amount || r.phone || r.fileNumber);
  const total = filled.reduce((s, r) => s + (Number(toLatinDigits(r.amount)) || 0), 0);

  const update = (key: number, k: keyof Draft, v: string) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [k]: v } : r)));

  function addRow(focus = true) {
    const r = blank();
    setRows((rs) => [...rs, r]);
    if (focus) setTimeout(() => tableRef.current?.querySelector<HTMLInputElement>(`[data-row="${r.key}"] input`)?.focus(), 30);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === rows.length - 1) addRow();
      else tableRef.current?.querySelector<HTMLInputElement>(`[data-row="${rows[idx + 1].key}"] input`)?.focus();
    }
  }

  async function saveAll() {
    if (!filled.length) return toast.error("أدخل سطرًا واحدًا على الأقل");
    setBusy(true);
    setResult(null);
    try {
      const payload = filled.map(draftToRow);
      const v = await importsService.validate(payload);
      if (v.invalidCount) {
        const map: Record<number, string[]> = {};
        v.rows.forEach((r) => {
          if (r.errors.length) map[filled[r.index].key] = r.errors;
        });
        setErrors(map);
        toast.error(`في ${v.invalidCount} سطر بها أخطاء. صحّحها ثم احفظ.`);
        return;
      }
      setErrors({});
      const res = await importsService.run(payload);
      setResult(res);
      setRows([blank(), blank(), blank()]);
      bump();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {result ? <ResultBanner result={result} /> : null}
      <Card>
        <CardHeader
          title="إدخال سريع"
          description="Enter في آخر سطر يضيف سطرًا جديدًا"
          actions={
            <span className="text-sm text-muted-foreground">
              <Num value={filled.length} /> سطر · <Money value={total} />
            </span>
          }
        />
        <Table>
          <thead>
            <tr>
              <Th className="w-10">#</Th>
              <Th className="w-28">رقم الملف القديم</Th>
              <Th className="min-w-52">الاسم *</Th>
              <Th className="w-28">الجنس *</Th>
              <Th className="w-20">العمر</Th>
              <Th className="w-36">الجوال</Th>
              <Th className="w-32">المبلغ *</Th>
              <Th className="min-w-40">ملاحظة</Th>
              <Th className="w-10">
                <span className="sr-only">حذف</span>
              </Th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {rows.map((r, i) => {
              const errs = errors[r.key];
              return (
                <tr key={r.key} data-row={r.key} className={cn(errs && "bg-debt-soft/50")}>
                  <Td className="text-xs text-muted-foreground">
                    <Num value={i + 1} />
                  </Td>
                  <Td>
                    <Input aria-label={`رقم الملف القديم سطر ${i + 1}`} inputMode="numeric" dir="ltr" className="num h-9 text-start" value={r.fileNumber} onChange={(e) => update(r.key, "fileNumber", toLatinDigits(e.target.value))} />
                  </Td>
                  <Td>
                    <Input aria-label={`الاسم سطر ${i + 1}`} className="h-9" value={r.name} onChange={(e) => update(r.key, "name", e.target.value)} />
                    {errs ? <p className="mt-1 text-xs text-debt">{errs.join("، ")}</p> : null}
                  </Td>
                  <Td>
                    <Select aria-label={`الجنس سطر ${i + 1}`} className="h-9" value={r.gender} onChange={(e) => update(r.key, "gender", e.target.value)}>
                      <option value="">—</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </Select>
                  </Td>
                  <Td>
                    <Input aria-label={`العمر سطر ${i + 1}`} inputMode="numeric" dir="ltr" className="num h-9 text-start" value={r.age} onChange={(e) => update(r.key, "age", toLatinDigits(e.target.value))} />
                  </Td>
                  <Td>
                    <Input aria-label={`الجوال سطر ${i + 1}`} type="tel" dir="ltr" className="num h-9 text-start" value={r.phone} onChange={(e) => update(r.key, "phone", toLatinDigits(e.target.value))} />
                  </Td>
                  <Td>
                    <Input aria-label={`المبلغ سطر ${i + 1}`} inputMode="numeric" dir="ltr" className="num h-9 text-start" value={r.amount} onChange={(e) => update(r.key, "amount", toLatinDigits(e.target.value).replace(/[^\d]/g, ""))} />
                  </Td>
                  <Td>
                    <Input aria-label={`ملاحظة سطر ${i + 1}`} className="h-9" value={r.note} onChange={(e) => update(r.key, "note", e.target.value)} onKeyDown={(e) => onKey(e, i)} />
                  </Td>
                  <Td>
                    <Button variant="ghost" size="icon" aria-label={`حذف السطر ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={() => addRow()}>
            <Plus /> إضافة سطر
          </Button>
          <Button loading={busy} onClick={saveAll} disabled={!filled.length}>
            حفظ الكل (<Num value={filled.length} />)
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ExcelImport() {
  const bump = useDrawers((s) => s.bump);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportValidation | null>(null);
  const [busy, setBusy] = useState<"read" | "run" | "template" | null>(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    if (!/\.xlsx$/i.test(f.name)) return toast.error("اختر ملف إكسل بصيغة xlsx");
    setFile(f);
    setPreview(null);
    setResult(null);
    setBusy("read");
    try {
      const raw = await readSheet(f);
      if (!raw.length) {
        toast.error("الملف فاضي. عبّئ القالب ثم ارفعه.");
        return;
      }
      const rows: ImportRow[] = raw.map((r) => ({
        fileNumber: num(r[0]),
        name: String(r[1] ?? "").trim(),
        gender: (parseGender(r[2]) || "x") as ImportRow["gender"],
        age: num(r[3]),
        phone: toLatinDigits(String(r[4] ?? "")).trim() || null,
        amount: amountOf(r[5]),
        note: String(r[6] ?? "").trim() || null,
      }));
      setPreview(await importsService.validate(rows));
    } catch (e) {
      toast.error(errorMessage(e) || "تعذر قراءة الملف");
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    if (!preview) return;
    setBusy("run");
    try {
      const valid = preview.rows.filter((r) => !r.errors.length).map((r) => r.row);
      const res = await importsService.run(valid);
      setResult(res);
      setPreview(null);
      setFile(null);
      bump();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {result ? <ResultBanner result={result} /> : null}
      <Card className="p-4 sm:p-5">
        <ol className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-semibold">1. حمّل القالب</p>
            <p className="mt-1 text-xs text-muted-foreground">الأعمدة: رقم الملف القديم، الاسم، الجنس، العمر، الجوال، المبلغ، ملاحظة</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              loading={busy === "template"}
              onClick={async () => {
                setBusy("template");
                try {
                  await downloadImportTemplate();
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Download /> تحميل القالب
            </Button>
          </li>
          <li className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-semibold">2. عبّئه وارفعه</p>
            <p className="mt-1 text-xs text-muted-foreground">الجنس يُكتب ذكر أو أنثى، والمبلغ رقم بدون فواصل.</p>
          </li>
          <li className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-semibold">3. راجع وأكّد</p>
            <p className="mt-1 text-xs text-muted-foreground">تُستورد الأسطر الصحيحة فقط، والأسطر اللي فيها أخطاء تظهر مع السبب.</p>
          </li>
        </ol>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            drag ? "border-primary bg-primary-soft" : "border-border",
          )}
        >
          <FileUp className="mb-2 size-8 text-muted-foreground" />
          <p className="font-medium">{file ? file.name : "اسحب ملف الإكسل هنا"}</p>
          <p className="mt-1 text-sm text-muted-foreground">أو</p>
          <Button variant="secondary" className="mt-2" loading={busy === "read"} onClick={() => inputRef.current?.click()}>
            <Upload /> اختيار ملف
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {preview ? (
        <Card>
          <CardHeader
            title="معاينة"
            description={
              <span className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 text-settled">
                  <CheckCircle2 className="size-4" /> <Num value={preview.validCount} /> صحيحة
                </span>
                <span className={cn("inline-flex items-center gap-1", preview.invalidCount ? "text-debt" : "text-muted-foreground")}>
                  <XCircle className="size-4" /> <Num value={preview.invalidCount} /> بها أخطاء
                </span>
              </span>
            }
            actions={
              <Button loading={busy === "run"} disabled={!preview.validCount} onClick={confirm}>
                تأكيد استيراد <Num value={preview.validCount} /> سطر
              </Button>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>رقم الملف</Th>
                <Th>الاسم</Th>
                <Th>الجنس</Th>
                <Th>العمر</Th>
                <Th>الجوال</Th>
                <Th className="text-end">المبلغ</Th>
                <Th>الحالة</Th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.index} className={cn(r.errors.length && "bg-debt-soft/50")}>
                  <Td className="text-xs text-muted-foreground">
                    <Num value={r.index + 2} />
                  </Td>
                  <Td>{r.row.fileNumber ? <Num value={String(r.row.fileNumber)} /> : <span className="text-xs text-muted-foreground">تلقائي</span>}</Td>
                  <Td>{r.row.name || "—"}</Td>
                  <Td>{r.row.gender === "male" ? "ذكر" : r.row.gender === "female" ? "أنثى" : "—"}</Td>
                  <Td>{r.row.age != null ? <Num value={r.row.age} /> : "—"}</Td>
                  <Td>{r.row.phone ? <Num value={r.row.phone} /> : "—"}</Td>
                  <Td className="text-end">
                    <Money value={r.row.amount || 0} plain />
                  </Td>
                  <Td>
                    {r.errors.length ? (
                      <span className="text-xs text-debt">{r.errors.join("، ")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-settled">
                        <CheckCircle2 className="size-3.5" /> صحيح
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground"># = رقم السطر في ملف الإكسل</p>
        </Card>
      ) : null}
    </div>
  );
}
