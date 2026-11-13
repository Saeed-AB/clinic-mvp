"use client";

import { KeyRound, Pencil, Plus, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/cancel-dialog";
import { Money } from "@/components/shared/money";
import { MoneyInput } from "@/components/shared/money-input";
import { ErrorState, LoadingRows, PageHeader } from "@/components/shared/states";
import { errorMessage } from "@/lib/api/client";
import type { Settings } from "@/lib/data/repository";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { CURRENCY_LABEL, toLatinDigits } from "@/lib/format/money";
import { settingsService, type SettingsResource } from "@/lib/services/settings";
import type { Currency, Role } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useSession } from "@/stores/session";

type Tab = "clinic" | "services" | "doctors" | "methods" | "users";
const TABS: { value: Tab; label: string }[] = [
  { value: "clinic", label: "إعدادات العيادة" },
  { value: "services", label: "الخدمات" },
  { value: "doctors", label: "الأطباء" },
  { value: "methods", label: "طرق الدفع" },
  { value: "users", label: "المستخدمون" },
];

function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "clinic") as Tab;
  const { data, error, loading, reload } = useApi(() => settingsService.all(), []);

  return (
    <div className="space-y-5">
      <PageHeader title="الإعدادات" description="كل القوائم فيها إضافة وتعديل وإيقاف، بدون حذف، حتى لا تتأثر البيانات القديمة." />
      <Tabs value={tab} onChange={(v) => router.replace(v === "clinic" ? pathname : `${pathname}?tab=${v}`, { scroll: false })} items={TABS} />
      {loading && !data ? (
        <LoadingRows rows={6} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          {tab === "clinic" ? <ClinicTab data={data} /> : null}
          {tab === "services" ? <ServicesTab data={data} /> : null}
          {tab === "doctors" ? <DoctorsTab data={data} /> : null}
          {tab === "methods" ? <MethodsTab data={data} /> : null}
          {tab === "users" ? <UsersTab data={data} /> : null}
        </>
      ) : null}
      <DemoReset />
    </div>
  );
}

function ClinicTab({ data }: { data: Settings }) {
  const bump = useDrawers((s) => s.bump);
  const [form, setForm] = useState({ ...data.clinic, fileNumberStart: String(data.clinic.fileNumberStart) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty =
    form.name !== data.clinic.name ||
    form.address !== data.clinic.address ||
    form.phone !== data.clinic.phone ||
    form.currency !== data.clinic.currency ||
    form.fileNumberStart !== String(data.clinic.fileNumberStart);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!form.name.trim()) return setErr("اسم العيادة مطلوب");
    setBusy(true);
    setErr(null);
    try {
      await settingsService.updateClinic({
        name: form.name,
        address: form.address,
        phone: form.phone,
        currency: form.currency,
        fileNumberStart: Number(form.fileNumberStart),
      });
      toast.success("تم حفظ إعدادات العيادة");
      bump();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="إعدادات العيادة" description="الاسم والعنوان والهاتف تظهر في الطباعة" />
      <form
        className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {err ? <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2 text-sm text-debt sm:col-span-2">{err}</p> : null}
        <Field label="اسم العيادة" htmlFor="c-name" required className="sm:col-span-2">
          <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="العنوان" htmlFor="c-address">
          <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="الهاتف" htmlFor="c-phone">
          <Input id="c-phone" dir="ltr" className="num text-start" value={form.phone} onChange={(e) => setForm({ ...form, phone: toLatinDigits(e.target.value) })} />
        </Field>
        <Field label="العملة الأساسية" htmlFor="c-currency" hint="تُحفظ العملة مع كل عملية مالية">
          <Select id="c-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
            {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="رقم بداية ملفات المرضى" htmlFor="c-start" hint="المرضى الجدد يأخذون الرقم التالي لأكبر رقم موجود">
          <MoneyInput id="c-start" value={form.fileNumberStart} onChange={(e) => setForm({ ...form, fileNumberStart: e.target.value })} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={busy} disabled={!dirty}>
            حفظ الإعدادات
          </Button>
          {dirty ? <span className="text-xs text-warning">في تغييرات ما انحفظت</span> : null}
        </div>
      </form>
    </Card>
  );
}

/** مكوّن عام لقوائم الإعدادات: جدول + نافذة إضافة/تعديل + مفتاح إيقاف */
function ListTab<T extends { id: string; active: boolean; name: string }>({
  title,
  description,
  addLabel,
  resource,
  items,
  columns,
  renderForm,
  emptyForm,
  toForm,
  validate,
  toPayload,
  extraActions,
}: {
  title: string;
  description?: string;
  addLabel: string;
  resource: SettingsResource;
  items: T[];
  columns: { header: string; cell: (item: T) => ReactNode; className?: string }[];
  renderForm: (form: Record<string, string | boolean>, set: (k: string, v: string | boolean) => void, isNew: boolean) => ReactNode;
  emptyForm: Record<string, string | boolean>;
  toForm: (item: T) => Record<string, string | boolean>;
  validate: (form: Record<string, string | boolean>, isNew: boolean) => string | null;
  toPayload: (form: Record<string, string | boolean>, isNew: boolean) => Record<string, unknown>;
  extraActions?: (item: T) => ReactNode;
}) {
  const bump = useDrawers((s) => s.bump);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(emptyForm);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isNew = editing === "new";

  const open = (item: T | "new") => {
    setEditing(item);
    setErr(null);
    setForm(item === "new" ? emptyForm : toForm(item));
  };

  async function save() {
    const v = validate(form, isNew);
    if (v) return setErr(v);
    setBusy(true);
    setErr(null);
    try {
      if (isNew) await settingsService.create(resource, toPayload(form, true));
      else if (editing) await settingsService.update(resource, editing.id, toPayload(form, false));
      toast.success(isNew ? "تمت الإضافة" : "تم حفظ التعديل");
      setEditing(null);
      bump();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: T, active: boolean) {
    try {
      await settingsService.update(resource, item.id, { ...toPayload(toForm(item), false), active });
      toast.success(active ? `تم تفعيل "${item.name}"` : `تم إيقاف "${item.name}"`);
      bump();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        actions={
          <Button size="sm" onClick={() => open("new")}>
            <Plus /> {addLabel}
          </Button>
        }
      />
      <Table>
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c.header} className={c.className}>
                {c.header}
              </Th>
            ))}
            <Th>الحالة</Th>
            <Th>
              <span className="sr-only">إجراءات</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={cn(!item.active && "text-muted-foreground")}>
              {columns.map((c) => (
                <Td key={c.header} className={c.className}>
                  {c.cell(item)}
                </Td>
              ))}
              <Td>
                <div className="flex items-center gap-2">
                  <Switch checked={item.active} onChange={(v) => toggle(item, v)} label={`${item.active ? "إيقاف" : "تفعيل"} ${item.name}`} />
                  <span className="text-xs">{item.active ? "فعّال" : "موقوف"}</span>
                </div>
              </Td>
              <Td className="text-end whitespace-nowrap">
                {extraActions?.(item)}
                <Button variant="ghost" size="icon" aria-label={`تعديل ${item.name}`} title="تعديل" onClick={() => open(item)}>
                  <Pencil />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Sheet
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        title={isNew ? addLabel : `تعديل: ${editing && editing !== "new" ? editing.name : ""}`}
        footer={
          <Button className="w-full" loading={busy} onClick={save}>
            {isNew ? "إضافة" : "حفظ التعديل"}
          </Button>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {err ? <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2 text-sm text-debt">{err}</p> : null}
          {renderForm(form, (k, v) => setForm((f) => ({ ...f, [k]: v })), isNew)}
          <button type="submit" hidden />
        </form>
      </Sheet>
    </Card>
  );
}

function ServicesTab({ data }: { data: Settings }) {
  const currency = data.clinic.currency;
  return (
    <ListTab
      title="الخدمات"
      description="السعر الافتراضي يظهر عند الإضافة ويمكن تعديله داخل الزيارة. تغيير السعر هنا لا يؤثر على الزيارات القديمة."
      addLabel="إضافة خدمة"
      resource="services"
      items={data.services}
      columns={[
        {
          header: "الخدمة",
          cell: (s) => (
            <span className="font-medium">
              {s.name}
              {s.isEntryFee ? <Badge className="ms-2 bg-primary-soft text-primary">رسوم دخول</Badge> : null}
            </span>
          ),
        },
        { header: "السعر الافتراضي", cell: (s) => <Money value={s.defaultPrice} currency={currency} /> },
      ]}
      emptyForm={{ name: "", defaultPrice: "", isEntryFee: false }}
      toForm={(s) => ({ name: s.name, defaultPrice: String(s.defaultPrice), isEntryFee: s.isEntryFee, active: s.active })}
      validate={(f) => (!String(f.name).trim() ? "اسم الخدمة مطلوب" : f.defaultPrice === "" ? "السعر الافتراضي مطلوب" : null)}
      toPayload={(f) => ({ name: f.name, defaultPrice: Number(f.defaultPrice), isEntryFee: !!f.isEntryFee, ...(f.active !== undefined ? { active: f.active } : {}) })}
      renderForm={(f, set) => (
        <>
          <Field label="اسم الخدمة" htmlFor="svc-name" required>
            <Input id="svc-name" autoFocus value={String(f.name)} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="السعر الافتراضي" htmlFor="svc-price" required>
            <MoneyInput id="svc-price" value={String(f.defaultPrice)} suffix={CURRENCY_LABEL[currency]} onChange={(e) => set("defaultPrice", e.target.value)} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={!!f.isEntryFee} onChange={(e) => set("isEntryFee", e.target.checked)} />
            <span>
              <span className="block text-sm font-medium">رسوم دخول</span>
              <span className="text-xs text-muted-foreground">تنضاف تلقائيًا مع كل زيارة. خدمة واحدة فقط تكون رسوم دخول، واختيارها يلغي السابقة.</span>
            </span>
          </label>
        </>
      )}
    />
  );
}

function DoctorsTab({ data }: { data: Settings }) {
  return (
    <ListTab
      title="الأطباء"
      description="الطبيب الموقوف لا يظهر في نافذة الزيارة، ويبقى في الزيارات القديمة."
      addLabel="إضافة طبيب"
      resource="doctors"
      items={data.doctors}
      columns={[
        { header: "الاسم", cell: (d) => <span className="font-medium">{d.name}</span> },
        { header: "التخصص", cell: (d) => d.specialty || "—", className: "max-sm:hidden" },
      ]}
      emptyForm={{ name: "", specialty: "" }}
      toForm={(d) => ({ name: d.name, specialty: d.specialty, active: d.active })}
      validate={(f) => (!String(f.name).trim() ? "اسم الطبيب مطلوب" : null)}
      toPayload={(f) => ({ name: f.name, specialty: f.specialty, ...(f.active !== undefined ? { active: f.active } : {}) })}
      renderForm={(f, set) => (
        <>
          <Field label="اسم الطبيب" htmlFor="doc-name" required>
            <Input id="doc-name" autoFocus value={String(f.name)} onChange={(e) => set("name", e.target.value)} placeholder="د. ..." />
          </Field>
          <Field label="التخصص" htmlFor="doc-spec">
            <Input id="doc-spec" value={String(f.specialty)} onChange={(e) => set("specialty", e.target.value)} />
          </Field>
        </>
      )}
    />
  );
}

function MethodsTab({ data }: { data: Settings }) {
  return (
    <ListTab
      title="طرق الدفع"
      description="أضف أسماء المحافظ الإلكترونية اللي تستخدمها العيادة، كل محفظة كطريقة دفع مستقلة."
      addLabel="إضافة طريقة دفع"
      resource="payment-methods"
      items={data.paymentMethods}
      columns={[{ header: "الاسم", cell: (m) => <span className="font-medium">{m.name}</span> }]}
      emptyForm={{ name: "" }}
      toForm={(m) => ({ name: m.name, active: m.active })}
      validate={(f) => (!String(f.name).trim() ? "الاسم مطلوب" : null)}
      toPayload={(f) => ({ name: f.name, ...(f.active !== undefined ? { active: f.active } : {}) })}
      renderForm={(f, set) => (
        <Field label="الاسم" htmlFor="pm-name" required hint="مثال: محفظة جيب، محفظة كاش">
          <Input id="pm-name" autoFocus value={String(f.name)} onChange={(e) => set("name", e.target.value)} />
        </Field>
      )}
    />
  );
}

function UsersTab({ data }: { data: Settings }) {
  const me = useSession((s) => s.user);
  const [reset, setReset] = useState<{ id: string; name: string } | null>(null);
  const [temp, setTemp] = useState<{ name: string; password: string } | null>(null);
  return (
    <>
      <ListTab
        title="المستخدمون"
        description="المدير له صلاحية على كل شيء، والمسجل صلاحياته محدودة بالتسجيل اليومي."
        addLabel="إضافة مستخدم"
        resource="users"
        items={data.users}
        columns={[
          {
            header: "الاسم",
            cell: (u) => (
              <span className="font-medium">
                {u.name}
                {u.id === me?.id ? <span className="ms-1 text-xs text-muted-foreground">(أنت)</span> : null}
              </span>
            ),
          },
          { header: "اسم المستخدم", cell: (u) => <span className="num">{u.username}</span>, className: "max-sm:hidden" },
          { header: "الصلاحية", cell: (u) => <Badge className={u.role === "admin" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}>{ROLE_LABEL[u.role]}</Badge> },
        ]}
        emptyForm={{ name: "", username: "", role: "receptionist", password: "" }}
        toForm={(u) => ({ name: u.name, username: u.username, role: u.role, active: u.active })}
        validate={(f, isNew) =>
          !String(f.name).trim()
            ? "الاسم مطلوب"
            : String(f.username).trim().length < 3
              ? "اسم المستخدم 3 أحرف على الأقل"
              : isNew && String(f.password).length < 6
                ? "كلمة المرور 6 أحرف على الأقل"
                : null
        }
        toPayload={(f, isNew) => ({
          name: f.name,
          username: f.username,
          role: f.role as Role,
          ...(f.active !== undefined ? { active: f.active } : {}),
          ...(isNew ? { password: f.password } : {}),
        })}
        extraActions={(u) => (
          <Button variant="ghost" size="icon" aria-label={`إعادة تعيين كلمة مرور ${u.name}`} title="إعادة تعيين كلمة المرور" onClick={() => setReset({ id: u.id, name: u.name })}>
            <KeyRound />
          </Button>
        )}
        renderForm={(f, set, isNew) => (
          <>
            <Field label="الاسم" htmlFor="u-name" required>
              <Input id="u-name" autoFocus value={String(f.name)} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="اسم المستخدم" htmlFor="u-username" required hint="حروف إنجليزية وأرقام">
              <Input id="u-username" dir="ltr" className="text-start" value={String(f.username)} onChange={(e) => set("username", e.target.value)} />
            </Field>
            <Field label="الصلاحية" htmlFor="u-role" required>
              <Select id="u-role" value={String(f.role)} onChange={(e) => set("role", e.target.value)}>
                <option value="receptionist">مسجل (موظف الاستقبال)</option>
                <option value="admin">مدير</option>
              </Select>
            </Field>
            {isNew ? (
              <Field label="كلمة المرور" htmlFor="u-pass" required hint="6 أحرف على الأقل">
                <Input id="u-pass" type="text" dir="ltr" className="text-start" value={String(f.password)} onChange={(e) => set("password", e.target.value)} />
              </Field>
            ) : null}
          </>
        )}
      />
      <ConfirmDialog
        open={!!reset}
        onOpenChange={(v) => !v && setReset(null)}
        title={`إعادة تعيين كلمة مرور ${reset?.name ?? ""}؟`}
        description="بتنشأ كلمة مرور مؤقتة تظهر لك مرة واحدة، وكلمة المرور القديمة تتوقف."
        confirmLabel="إعادة التعيين"
        onConfirm={async () => {
          const r = await settingsService.resetPassword(reset!.id);
          setTemp({ name: reset!.name, password: r.temporaryPassword });
        }}
      />
      <Dialog
        open={!!temp}
        onOpenChange={(v) => !v && setTemp(null)}
        title="كلمة المرور المؤقتة"
        description={`أعطها لـ ${temp?.name ?? ""}. لن تظهر مرة أخرى.`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(temp?.password ?? "");
                toast.success("تم النسخ");
              }}
            >
              نسخ
            </Button>
            <Button onClick={() => setTemp(null)}>تم</Button>
          </>
        }
      >
        <p className="num w-full rounded-lg bg-muted py-4 text-center text-2xl font-bold tracking-widest">{temp?.password}</p>
      </Dialog>
    </>
  );
}

function DemoReset() {
  const bump = useDrawers((s) => s.bump);
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-dashed p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">النسخة التجريبية</p>
          <p className="text-sm text-muted-foreground">إرجاع كل البيانات الوهمية لحالتها الأصلية. يختفي هذا القسم عند ربط قاعدة البيانات.</p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <RotateCcw /> إعادة ضبط البيانات التجريبية
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="إعادة ضبط البيانات التجريبية؟"
        description="كل التعديلات اللي سويتها في النسخة التجريبية بتضيع."
        confirmLabel="إعادة الضبط"
        danger
        onConfirm={async () => {
          await settingsService.resetDemo();
          toast.success("تمت إعادة البيانات التجريبية");
          bump();
        }}
      />
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingRows rows={6} />}>
      <SettingsView />
    </Suspense>
  );
}
