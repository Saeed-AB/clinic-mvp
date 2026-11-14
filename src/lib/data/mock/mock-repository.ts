// تنفيذ الـ Repository فوق المخزن الوهمي. كل القواعد المالية من lib/domain.

import {
  balanceIndicator,
  buildLedger,
  clampDiscount,
  countsInBalance,
  discountToAmount,
  groupBy,
  patientBalance,
  paymentsTotal,
  servicesTotal,
  visitTotal,
} from "../../domain/balance";
import { ageFromBirthYear, adenDate, birthYearFromAge, diffDays, todayAden } from "../../domain/dates";
import { can, type Action } from "../../domain/permissions";
import type {
  DailyClosing,
  DashboardData,
  DebtorRow,
  ImportRow,
  ImportValidation,
  Patient,
  PatientSummary,
  Payment,
  PublicUser,
  User,
  Visit,
  VisitDetails,
  VisitRow,
} from "../../types";
import {
  AppError,
  type Actor,
  type DebtorFilter,
  type PatientFilter,
  type PatientInput,
  type PaymentInput,
  type Repository,
  type VisitFilter,
  type VisitInput,
} from "../repository";
import type { Db } from "./seed";
import { getDb, resetDb } from "./store";

const nowIso = () => new Date().toISOString();
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Aden", hour: "2-digit", minute: "2-digit", hour12: false });
const timeOf = (iso: string) => timeFmt.format(new Date(iso));

function publicUser(u: User): PublicUser {
  const { password: _p, ...rest } = u;
  return rest;
}

function assertCan(actor: Actor, action: Action, ctx: Parameters<typeof can>[2] = {}) {
  if (!can(actor.role, action, ctx)) {
    const closed = ctx?.visitStatus === "completed";
    throw new AppError("FORBIDDEN", closed ? "الزيارة مغلقة، والتعديل عليها للمدير فقط" : "هذه العملية للمدير فقط");
  }
}

function cleanPhone(p?: string | null): string | null {
  const v = (p ?? "").replace(/[^\d+]/g, "");
  return v.length ? v : null;
}

function cleanText(t?: string | null): string | null {
  const v = (t ?? "").trim();
  return v.length ? v : null;
}

export class MockRepository implements Repository {
  private get db(): Db {
    return getDb();
  }

  private newId(prefix: string) {
    return `${prefix}_${(this.db.counters.id++).toString(36)}`;
  }

  private audit(actor: Actor, action: string, entity: string, entityId: string, before: unknown, after: unknown) {
    this.db.auditLogs.push({ id: this.newId("log"), userId: actor.id, at: nowIso(), action, entity, entityId, before, after });
  }

  // ———— أدوات داخلية ————

  private userName(id: string | null | undefined) {
    return this.db.users.find((u) => u.id === id)?.name ?? "—";
  }
  private doctorName(id: string) {
    return this.db.doctors.find((d) => d.id === id)?.name ?? "—";
  }
  private methodName(id: string) {
    return this.db.paymentMethods.find((m) => m.id === id)?.name ?? "—";
  }

  private findPatient(id: string): Patient {
    const p = this.db.patients.find((x) => x.id === id);
    if (!p) throw new AppError("NOT_FOUND", "المريض غير موجود");
    return p;
  }

  private findVisit(id: string): Visit {
    const v = this.db.visits.find((x) => x.id === id);
    if (!v) throw new AppError("NOT_FOUND", "الزيارة غير موجودة");
    return v;
  }

  private moneyOf(patientId: string) {
    const visits = this.db.visits.filter((v) => v.patientId === patientId);
    const ids = new Set(visits.map((v) => v.id));
    return {
      visits,
      services: this.db.visitServices.filter((s) => ids.has(s.visitId)),
      payments: this.db.payments.filter((p) => p.patientId === patientId),
      openings: this.db.openingBalances.filter((o) => o.patientId === patientId),
    };
  }

  private balanceOf(patientId: string) {
    return patientBalance(this.moneyOf(patientId));
  }

  private summary(p: Patient): PatientSummary {
    const balance = this.balanceOf(p.id);
    return { ...p, age: ageFromBirthYear(p.birthYear), balance, indicator: balanceIndicator(balance) };
  }

  private visitServices(visitId: string) {
    return this.db.visitServices.filter((s) => s.visitId === visitId);
  }

  private visitPayments(visitId: string) {
    return this.db.payments.filter((p) => p.visitId === visitId);
  }

  private visitRow(v: Visit): VisitRow {
    const p = this.findPatient(v.patientId);
    const services = this.visitServices(v.id);
    const total = v.status === "cancelled" ? 0 : visitTotal(v, services);
    const paid = paymentsTotal(this.visitPayments(v.id));
    return {
      id: v.id,
      number: v.number,
      date: v.date,
      time: timeOf(v.checkedInAt ?? v.createdAt),
      status: v.status,
      patientId: p.id,
      patientName: p.name,
      fileNumber: p.fileNumber,
      doctorId: v.doctorId,
      doctorName: this.doctorName(v.doctorId),
      total,
      paid,
      remaining: v.status === "cancelled" || v.status === "scheduled" ? 0 : total - paid,
    };
  }

  private details(v: Visit): VisitDetails {
    const services = this.visitServices(v.id);
    const payments = this.visitPayments(v.id);
    const sTotal = servicesTotal(services);
    const discount = clampDiscount(v.discount, sTotal);
    const total = sTotal - discount;
    const paid = paymentsTotal(payments);
    const doctor = this.db.doctors.find((d) => d.id === v.doctorId)!;
    return {
      visit: v,
      patient: this.summary(this.findPatient(v.patientId)),
      doctor,
      services: services.map((s) => ({ ...s, addedByName: this.userName(s.addedBy) })),
      payments: payments
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((p) => ({ ...p, methodName: this.methodName(p.methodId), createdByName: this.userName(p.createdBy) })),
      totals: { services: sTotal, discount, total, paid, remaining: total - paid },
      createdByName: this.userName(v.createdBy),
      clinic: this.db.clinic,
    };
  }

  /** الزيارة قابلة للتعديل؟ الملغاة لا، والمكتملة للمدير فقط */
  private assertEditable(actor: Actor, v: Visit, action: Action) {
    if (v.status === "cancelled") throw new AppError("CONFLICT", "الزيارة ملغاة ولا يمكن تعديلها");
    assertCan(actor, action, { visitStatus: v.status });
  }

  private validatePayment(input: PaymentInput) {
    if (!Number.isInteger(input.amount) || input.amount <= 0) throw new AppError("VALIDATION", "المبلغ يجب أن يكون أكبر من صفر");
    const m = this.db.paymentMethods.find((x) => x.id === input.methodId && x.active);
    if (!m) throw new AppError("VALIDATION", "طريقة الدفع غير متاحة");
  }

  private makePayment(actor: Actor, patientId: string, visitId: string | null, input: PaymentInput): Payment {
    this.validatePayment(input);
    const pay: Payment = {
      id: this.newId("pay"),
      patientId,
      visitId,
      kind: visitId ? "visit" : "settlement",
      amount: input.amount,
      currency: this.db.clinic.currency,
      methodId: input.methodId,
      receiptNo: cleanText(input.receiptNo),
      note: cleanText(input.note),
      createdAt: nowIso(),
      createdBy: actor.id,
      cancelled: false,
      cancelReason: null,
      cancelledBy: null,
    };
    this.db.payments.push(pay);
    this.audit(actor, "create", "payment", pay.id, null, pay);
    return pay;
  }

  private nextFileNumber(): number {
    const max = this.db.patients.reduce((m, p) => Math.max(m, p.fileNumber), this.db.clinic.fileNumberStart - 1);
    return Math.max(max + 1, this.db.clinic.fileNumberStart);
  }

  private buildPatient(actor: Actor, input: PatientInput): Patient {
    const name = input.name?.trim();
    if (!name) throw new AppError("VALIDATION", "اسم المريض مطلوب");
    if (input.gender !== "male" && input.gender !== "female") throw new AppError("VALIDATION", "الجنس مطلوب");
    let fileNumber = this.nextFileNumber();
    if (input.fileNumber != null && input.fileNumber !== fileNumber) {
      assertCan(actor, "patient.editFileNumber");
      fileNumber = input.fileNumber;
    }
    if (this.db.patients.some((p) => p.fileNumber === fileNumber)) {
      throw new AppError("CONFLICT", `رقم الملف ${fileNumber} مستخدم لمريض آخر`);
    }
    return {
      id: this.newId("p"),
      fileNumber,
      name,
      gender: input.gender,
      birthYear: birthYearFromAge(input.age ?? null),
      phone: cleanPhone(input.phone),
      area: cleanText(input.area),
      notes: cleanText(input.notes),
      createdAt: nowIso(),
      createdBy: actor.id,
    };
  }

  // ———— الدخول ————

  async authenticate(username: string, password: string) {
    const u = this.db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u || u.password !== password) throw new AppError("UNAUTHORIZED", "اسم المستخدم أو كلمة المرور غير صحيحة");
    if (!u.active) throw new AppError("FORBIDDEN", "هذا الحساب موقوف، تواصل مع مدير العيادة");
    return publicUser(u);
  }

  async getUser(id: string) {
    const u = this.db.users.find((x) => x.id === id && x.active);
    return u ? publicUser(u) : null;
  }

  async getLookups() {
    return {
      clinic: this.db.clinic,
      services: this.db.services,
      doctors: this.db.doctors,
      paymentMethods: this.db.paymentMethods,
      nextFileNumber: this.nextFileNumber(),
    };
  }

  // ———— الرئيسية ————

  async getDashboard(actor: Actor, date: string): Promise<DashboardData> {
    const dayVisits = this.db.visits.filter((v) => v.date === date);
    const rows = dayVisits.map((v) => this.visitRow(v)).sort((a, b) => a.time.localeCompare(b.time));
    const closing = await this.getDailyClosing(date);
    const data: DashboardData = {
      date,
      visitsCount: dayVisits.filter((v) => v.status !== "cancelled").length,
      openCount: dayVisits.filter((v) => v.status === "open").length,
      collected: closing.collected,
      newDebts: closing.newDebts,
      todayVisits: rows,
    };
    if (actor.role === "admin") {
      const { total, count } = await this.listDebtors({});
      data.admin = { totalDebts: total, debtorsCount: count };
    }
    return data;
  }

  // ———— المرضى ————

  async searchPatients(q: string) {
    const term = q.trim();
    if (!term) return { byFileNumber: null, byPhone: [] };
    const digits = term.replace(/[^\d]/g, "");
    // رقم الملف أقصر من الجوال؛ نجرب الاثنين
    const byFile = /^\d{1,7}$/.test(digits) ? this.db.patients.find((p) => p.fileNumber === Number(digits)) : undefined;
    const byPhone = digits.length >= 6 ? this.db.patients.filter((p) => p.phone && p.phone.replace(/[^\d]/g, "").endsWith(digits)) : [];
    return {
      byFileNumber: byFile ? this.summary(byFile) : null,
      byPhone: byPhone.map((p) => this.summary(p)),
    };
  }

  async listPatients(filter: PatientFilter) {
    let rows = this.db.patients.map((p) => this.summary(p));

    const q = filter.q?.trim();
    if (q) {
      const digits = q.replace(/[^\d]/g, "");
      rows = rows.filter((p) => String(p.fileNumber) === digits || (digits.length >= 3 && (p.phone ?? "").replace(/[^\d]/g, "").includes(digits)) || p.name.includes(q));
    }
    if (filter.gender) rows = rows.filter((p) => p.gender === filter.gender);
    if (filter.indicator) rows = rows.filter((p) => p.indicator === filter.indicator);

    const sort = filter.sort ?? "name";
    rows = [...rows].sort((a, b) => {
      if (sort === "fileNumber") return a.fileNumber - b.fileNumber;
      if (sort === "balance") return b.balance - a.balance;
      return a.name.localeCompare(b.name, "ar");
    });

    return { rows, total: rows.length };
  }

  async isFileNumberTaken(fileNumber: number, excludePatientId?: string) {
    return this.db.patients.some((p) => p.fileNumber === fileNumber && p.id !== excludePatientId);
  }

  async createPatient(actor: Actor, input: PatientInput) {
    const p = this.buildPatient(actor, input);
    this.db.patients.push(p);
    this.audit(actor, "create", "patient", p.id, null, p);
    return this.summary(p);
  }

  async updatePatient(actor: Actor, id: string, input: PatientInput) {
    const p = this.findPatient(id);
    const before = { ...p };
    if (!input.name?.trim()) throw new AppError("VALIDATION", "اسم المريض مطلوب");
    if (input.fileNumber != null && input.fileNumber !== p.fileNumber) {
      assertCan(actor, "patient.editFileNumber");
      if (await this.isFileNumberTaken(input.fileNumber, p.id)) throw new AppError("CONFLICT", `رقم الملف ${input.fileNumber} مستخدم لمريض آخر`);
      p.fileNumber = input.fileNumber;
    }
    p.name = input.name.trim();
    p.gender = input.gender;
    p.birthYear = birthYearFromAge(input.age ?? null);
    p.phone = cleanPhone(input.phone);
    p.area = cleanText(input.area);
    p.notes = cleanText(input.notes);
    this.audit(actor, "update", "patient", p.id, before, { ...p });
    return this.summary(p);
  }

  async getPatient(id: string) {
    return this.summary(this.findPatient(id));
  }

  async getLedger(patientId: string) {
    this.findPatient(patientId);
    return buildLedger({
      ...this.moneyOf(patientId),
      doctorName: (id) => this.doctorName(id),
      methodName: (id) => this.methodName(id),
    });
  }

  async addOpeningBalance(actor: Actor, patientId: string, input: { amount: number; note?: string | null }) {
    assertCan(actor, "openingBalance.add");
    this.findPatient(patientId);
    if (!Number.isInteger(input.amount) || input.amount <= 0) throw new AppError("VALIDATION", "المبلغ يجب أن يكون أكبر من صفر");
    const ob = {
      id: this.newId("ob"),
      patientId,
      amount: input.amount,
      currency: this.db.clinic.currency,
      note: cleanText(input.note),
      createdAt: nowIso(),
      createdBy: actor.id,
      cancelled: false,
    };
    this.db.openingBalances.push(ob);
    this.audit(actor, "create", "openingBalance", ob.id, null, ob);
    return this.getPatient(patientId);
  }

  async addSettlement(actor: Actor, patientId: string, input: PaymentInput) {
    this.findPatient(patientId);
    this.makePayment(actor, patientId, null, input);
    return this.getPatient(patientId);
  }

  // ———— الزيارات ————

  async listVisits(filter: VisitFilter) {
    let list = this.db.visits.filter((v) => v.date === filter.date);
    const summarySource = list;
    if (filter.status) list = list.filter((v) => v.status === filter.status);
    if (filter.doctorId) list = list.filter((v) => v.doctorId === filter.doctorId);
    const rows = list.map((v) => this.visitRow(v)).sort((a, b) => a.time.localeCompare(b.time));
    const collected = this.db.payments
      .filter((p) => !p.cancelled && adenDate(p.createdAt) === filter.date)
      .reduce((s, p) => s + p.amount, 0);
    return {
      rows,
      summary: {
        count: summarySource.filter((v) => v.status !== "cancelled").length,
        open: summarySource.filter((v) => v.status === "open").length,
        collected,
      },
    };
  }

  async createVisit(actor: Actor, input: VisitInput) {
    const today = todayAden();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new AppError("VALIDATION", "تاريخ الزيارة غير صحيح");
    if (input.date < today) throw new AppError("VALIDATION", "لا يمكن تسجيل زيارة بتاريخ سابق");
    const doctor = this.db.doctors.find((d) => d.id === input.doctorId && d.active);
    if (!doctor) throw new AppError("VALIDATION", "اختر الطبيب");

    let patient: Patient;
    if (input.patientId) patient = this.findPatient(input.patientId);
    else if (input.newPatient) {
      patient = this.buildPatient(actor, input.newPatient);
      this.db.patients.push(patient);
      this.audit(actor, "create", "patient", patient.id, null, patient);
    } else throw new AppError("VALIDATION", "اختر المريض أو أضف مريضًا جديدًا");

    const isToday = input.date === today;
    const now = nowIso();
    const v: Visit = {
      id: this.newId("v"),
      number: ++this.db.counters.visit,
      patientId: patient.id,
      doctorId: doctor.id,
      date: input.date,
      status: isToday ? "open" : "scheduled",
      discount: 0,
      discountBy: null,
      currency: this.db.clinic.currency,
      createdAt: now,
      createdBy: actor.id,
      checkedInAt: isToday ? now : null,
      closedAt: null,
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null,
      treatmentPlanId: null,
    };
    this.db.visits.push(v);
    this.audit(actor, "create", "visit", v.id, null, v);

    for (const s of input.services ?? []) this.pushService(actor, v, s.serviceId, s.price);
    if (input.payment && input.payment.amount > 0) {
      if (!isToday) throw new AppError("VALIDATION", "الدفع يكون عند حضور المريض، وليس للزيارة المجدولة");
      this.makePayment(actor, patient.id, v.id, input.payment);
    }
    return this.details(v);
  }

  private pushService(actor: Actor, v: Visit, serviceId: string, price: number) {
    const svc = this.db.services.find((s) => s.id === serviceId);
    if (!svc) throw new AppError("VALIDATION", "الخدمة غير موجودة");
    if (!svc.active) throw new AppError("VALIDATION", `الخدمة "${svc.name}" موقوفة`);
    if (!Number.isInteger(price) || price < 0) throw new AppError("VALIDATION", "سعر الخدمة غير صحيح");
    const row = {
      id: this.newId("vs"),
      visitId: v.id,
      serviceId,
      name: svc.name,
      price,
      addedBy: actor.id,
      addedAt: nowIso(),
      cancelled: false,
      cancelReason: null,
    };
    this.db.visitServices.push(row);
    this.audit(actor, "create", "visitService", row.id, null, row);
  }

  async getVisit(id: string) {
    return this.details(this.findVisit(id));
  }

  async checkInVisit(actor: Actor, id: string) {
    const v = this.findVisit(id);
    if (v.status !== "scheduled") throw new AppError("CONFLICT", "تسجيل الحضور للزيارات المجدولة فقط");
    const before = { ...v };
    const today = todayAden();
    v.status = "open";
    v.checkedInAt = nowIso();
    // إذا حضر المريض في يوم غير يوم الموعد، تنتقل الزيارة لليوم
    if (v.date !== today) v.date = today;
    // رسوم الدخول تنضاف تلقائيًا عند الحضور إذا لم تكن موجودة
    const entry = this.db.services.find((s) => s.isEntryFee && s.active);
    if (entry && !this.visitServices(v.id).some((s) => s.serviceId === entry.id && !s.cancelled)) {
      this.pushService(actor, v, entry.id, entry.defaultPrice);
    }
    this.audit(actor, "checkIn", "visit", v.id, before, { ...v });
    return this.details(v);
  }

  async closeVisit(actor: Actor, id: string) {
    const v = this.findVisit(id);
    if (v.status !== "open") throw new AppError("CONFLICT", "إغلاق الزيارة للزيارات المفتوحة فقط");
    assertCan(actor, "visit.close", { visitStatus: v.status });
    const before = { ...v };
    v.status = "completed";
    v.closedAt = nowIso();
    this.audit(actor, "close", "visit", v.id, before, { ...v });
    return this.details(v);
  }

  async cancelVisit(actor: Actor, id: string, reason: string) {
    assertCan(actor, "visit.cancel");
    const v = this.findVisit(id);
    if (v.status === "cancelled") throw new AppError("CONFLICT", "الزيارة ملغاة مسبقًا");
    if (!reason?.trim()) throw new AppError("VALIDATION", "اذكر سبب الإلغاء");
    if (paymentsTotal(this.visitPayments(v.id)) > 0) {
      throw new AppError("CONFLICT", "على الزيارة دفعات فعّالة. ألغِ الدفعات أولًا ثم ألغِ الزيارة");
    }
    const before = { ...v };
    v.status = "cancelled";
    v.cancelledAt = nowIso();
    v.cancelReason = reason.trim();
    v.cancelledBy = actor.id;
    this.audit(actor, "cancel", "visit", v.id, before, { ...v });
    return this.details(v);
  }

  async addVisitService(actor: Actor, visitId: string, input: { serviceId: string; price: number }) {
    const v = this.findVisit(visitId);
    this.assertEditable(actor, v, "visit.editServices");
    this.pushService(actor, v, input.serviceId, input.price);
    return this.details(v);
  }

  async updateVisitService(actor: Actor, visitId: string, rowId: string, input: { price: number }) {
    const v = this.findVisit(visitId);
    this.assertEditable(actor, v, "visit.editServices");
    const row = this.db.visitServices.find((s) => s.id === rowId && s.visitId === visitId);
    if (!row) throw new AppError("NOT_FOUND", "الخدمة غير موجودة في هذه الزيارة");
    if (row.cancelled) throw new AppError("CONFLICT", "الخدمة ملغاة");
    if (!Number.isInteger(input.price) || input.price < 0) throw new AppError("VALIDATION", "سعر الخدمة غير صحيح");
    const before = { ...row };
    row.price = input.price;
    this.audit(actor, "update", "visitService", row.id, before, { ...row });
    return this.details(v);
  }

  async cancelVisitService(actor: Actor, visitId: string, rowId: string, reason: string) {
    const v = this.findVisit(visitId);
    this.assertEditable(actor, v, "visit.editServices");
    const row = this.db.visitServices.find((s) => s.id === rowId && s.visitId === visitId);
    if (!row) throw new AppError("NOT_FOUND", "الخدمة غير موجودة في هذه الزيارة");
    if (row.cancelled) throw new AppError("CONFLICT", "الخدمة ملغاة مسبقًا");
    if (!reason?.trim()) throw new AppError("VALIDATION", "اذكر سبب الإلغاء");
    const before = { ...row };
    row.cancelled = true;
    row.cancelReason = reason.trim();
    // الخصم لا يتجاوز الإجمالي الجديد
    v.discount = clampDiscount(v.discount, servicesTotal(this.visitServices(v.id)));
    this.audit(actor, "cancel", "visitService", row.id, before, { ...row });
    return this.details(v);
  }

  async setDiscount(actor: Actor, visitId: string, input: { value: number; type: "amount" | "percent" }) {
    const v = this.findVisit(visitId);
    this.assertEditable(actor, v, "visit.discount");
    if (!(input.value >= 0)) throw new AppError("VALIDATION", "قيمة الخصم غير صحيحة");
    const total = servicesTotal(this.visitServices(v.id));
    if (input.type === "percent" && input.value > 100) throw new AppError("VALIDATION", "النسبة لا تتجاوز 100%");
    if (input.type === "amount" && input.value > total) throw new AppError("VALIDATION", "الخصم أكبر من إجمالي الخدمات");
    const before = { ...v };
    v.discount = discountToAmount(input.value, input.type, total);
    v.discountBy = v.discount > 0 ? actor.id : null;
    this.audit(actor, "discount", "visit", v.id, before, { ...v });
    return this.details(v);
  }

  async addVisitPayment(actor: Actor, visitId: string, input: PaymentInput) {
    const v = this.findVisit(visitId);
    if (v.status === "scheduled") throw new AppError("CONFLICT", "سجّل حضور المريض أولًا ثم أضف الدفعة");
    this.assertEditable(actor, v, "visit.pay");
    this.makePayment(actor, v.patientId, v.id, input);
    return this.details(v);
  }

  async cancelPayment(actor: Actor, paymentId: string, reason: string) {
    const p = this.db.payments.find((x) => x.id === paymentId);
    if (!p) throw new AppError("NOT_FOUND", "الدفعة غير موجودة");
    if (p.cancelled) throw new AppError("CONFLICT", "الدفعة ملغاة مسبقًا");
    const v = p.visitId ? this.findVisit(p.visitId) : null;
    assertCan(actor, "payment.cancel", { visitStatus: v?.status });
    if (!reason?.trim()) throw new AppError("VALIDATION", "اذكر سبب الإلغاء");
    const before = { ...p };
    p.cancelled = true;
    p.cancelReason = reason.trim();
    p.cancelledBy = actor.id;
    this.audit(actor, "cancel", "payment", p.id, before, { ...p });
    return { patientId: p.patientId, visitId: p.visitId };
  }

  // ———— المدينون ————

  async listDebtors(filter: DebtorFilter) {
    const today = todayAden();
    const rows: DebtorRow[] = [];
    const visitsByPatient = groupBy(this.db.visits, (v) => v.patientId);
    const paysByPatient = groupBy(this.db.payments.filter((p) => !p.cancelled), (p) => p.patientId);
    for (const p of this.db.patients) {
      const balance = this.balanceOf(p.id);
      if (balance <= 0) continue;
      const visits = (visitsByPatient.get(p.id) ?? []).filter(countsInBalance);
      const pays = paysByPatient.get(p.id) ?? [];
      const lastVisit = visits.reduce<string | null>((m, v) => (!m || v.date > m ? v.date : m), null);
      const lastPayment = pays.reduce<string | null>((m, x) => {
        const d = adenDate(x.createdAt);
        return !m || d > m ? d : m;
      }, null);
      rows.push({ patientId: p.id, fileNumber: p.fileNumber, name: p.name, phone: p.phone, balance, lastVisit, lastPayment });
    }
    const total = rows.reduce((s, r) => s + r.balance, 0);
    const count = rows.length;

    let list = rows;
    const q = filter.q?.trim();
    if (q) {
      const digits = q.replace(/[^\d]/g, "");
      list = list.filter(
        (r) => String(r.fileNumber) === digits || (digits.length >= 4 && (r.phone ?? "").includes(digits)) || r.name.includes(q),
      );
    }
    if (filter.inactiveDays) {
      const n = filter.inactiveDays;
      list = list.filter((r) => {
        const ref = r.lastPayment ?? r.lastVisit;
        return !ref || diffDays(ref, today) > n;
      });
    }
    if (filter.sort === "oldest") {
      list = list.slice().sort((a, b) => (a.lastPayment ?? "0000").localeCompare(b.lastPayment ?? "0000"));
    } else {
      list = list.slice().sort((a, b) => b.balance - a.balance);
    }
    return { rows: list, total, count };
  }

  // ———— الإقفال اليومي ————

  async getDailyClosing(date: string): Promise<DailyClosing> {
    const dayVisits = this.db.visits.filter((v) => v.date === date && countsInBalance(v));
    const dayVisitIds = new Set(dayVisits.map((v) => v.id));
    const dayPays = this.db.payments.filter((p) => adenDate(p.createdAt) === date);
    const activeDayPays = dayPays.filter((p) => !p.cancelled);

    let servicesSum = 0;
    let discountsSum = 0;
    let newDebts = 0;
    const byDoctor = new Map<string, { visits: number; services: number }>();
    const byUser = new Map<string, { amount: number; count: number }>();
    for (const v of dayVisits) {
      const services = this.visitServices(v.id);
      const s = servicesTotal(services);
      const d = clampDiscount(v.discount, s);
      servicesSum += s;
      discountsSum += d;
      const paid = paymentsTotal(this.visitPayments(v.id).filter((p) => adenDate(p.createdAt) === date));
      newDebts += Math.max(0, s - d - paid);
      const doc = byDoctor.get(v.doctorId) ?? { visits: 0, services: 0 };
      doc.visits += 1;
      doc.services += s;
      byDoctor.set(v.doctorId, doc);
      if (d > 0 && v.discountBy) {
        const u = byUser.get(v.discountBy) ?? { amount: 0, count: 0 };
        u.amount += d;
        u.count += 1;
        byUser.set(v.discountBy, u);
      }
    }

    const collected = activeDayPays.reduce((s, p) => s + p.amount, 0);
    const fromToday = activeDayPays.filter((p) => p.visitId && dayVisitIds.has(p.visitId)).reduce((s, p) => s + p.amount, 0);
    const byMethod = new Map<string, { amount: number; count: number }>();
    for (const p of activeDayPays) {
      const m = byMethod.get(p.methodId) ?? { amount: 0, count: 0 };
      m.amount += p.amount;
      m.count += 1;
      byMethod.set(p.methodId, m);
    }

    const patientOf = (id: string) => this.db.patients.find((x) => x.id === id);
    return {
      date,
      visitsCount: dayVisits.length,
      servicesTotal: servicesSum,
      discountsTotal: discountsSum,
      collected,
      collectedFromToday: fromToday,
      collectedFromPrevious: collected - fromToday,
      newDebts,
      byMethod: [...byMethod.entries()].map(([methodId, v]) => ({ methodId, name: this.methodName(methodId), ...v })),
      discountsByUser: [...byUser.entries()].map(([userId, v]) => ({ userId, name: this.userName(userId), ...v })),
      byDoctor: [...byDoctor.entries()].map(([doctorId, v]) => ({ doctorId, name: this.doctorName(doctorId), ...v })),
      openVisits: this.db.visits.filter((v) => v.date === date && v.status === "open").map((v) => this.visitRow(v)),
      transactions: dayPays
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((p) => {
          const pt = patientOf(p.patientId);
          return {
            id: p.id,
            time: timeOf(p.createdAt),
            type: p.kind === "settlement" ? ("settlement" as const) : ("payment" as const),
            patientId: p.patientId,
            patientName: pt?.name ?? "—",
            fileNumber: pt?.fileNumber ?? 0,
            amount: p.amount,
            methodName: this.methodName(p.methodId),
            userName: this.userName(p.createdBy),
            cancelled: p.cancelled,
          };
        }),
    };
  }

  // ———— الإعدادات ————

  async getSettings() {
    return {
      clinic: this.db.clinic,
      services: this.db.services,
      doctors: this.db.doctors,
      paymentMethods: this.db.paymentMethods,
      users: this.db.users.map(publicUser),
    };
  }

  async updateClinic(actor: Actor, input: Partial<Omit<Db["clinic"], "id">>) {
    assertCan(actor, "settings.manage");
    const before = { ...this.db.clinic };
    if (input.name !== undefined && !input.name.trim()) throw new AppError("VALIDATION", "اسم العيادة مطلوب");
    Object.assign(this.db.clinic, input);
    this.audit(actor, "update", "clinic", this.db.clinic.id, before, { ...this.db.clinic });
    return this.db.clinic;
  }

  async saveService(actor: Actor, input: Partial<Db["services"][number]> & { name: string; defaultPrice: number }) {
    assertCan(actor, "settings.manage");
    if (!input.name.trim()) throw new AppError("VALIDATION", "اسم الخدمة مطلوب");
    if (!Number.isInteger(input.defaultPrice) || input.defaultPrice < 0) throw new AppError("VALIDATION", "السعر غير صحيح");
    let svc = input.id ? this.db.services.find((s) => s.id === input.id) : undefined;
    const before = svc ? { ...svc } : null;
    if (!svc) {
      svc = { id: this.newId("s"), name: input.name.trim(), defaultPrice: input.defaultPrice, active: input.active ?? true, isEntryFee: false };
      this.db.services.push(svc);
    } else {
      svc.name = input.name.trim();
      svc.defaultPrice = input.defaultPrice;
      if (input.active !== undefined) svc.active = input.active;
    }
    if (input.isEntryFee !== undefined) {
      // خدمة واحدة فقط تكون "رسوم دخول"
      if (input.isEntryFee) this.db.services.forEach((s) => (s.isEntryFee = s.id === svc!.id));
      else svc.isEntryFee = false;
    }
    this.audit(actor, before ? "update" : "create", "service", svc.id, before, { ...svc });
    return svc;
  }

  async saveDoctor(actor: Actor, input: Partial<Db["doctors"][number]> & { name: string }) {
    assertCan(actor, "settings.manage");
    if (!input.name.trim()) throw new AppError("VALIDATION", "اسم الطبيب مطلوب");
    let d = input.id ? this.db.doctors.find((x) => x.id === input.id) : undefined;
    const before = d ? { ...d } : null;
    if (!d) {
      d = { id: this.newId("d"), name: input.name.trim(), specialty: input.specialty?.trim() ?? "", active: input.active ?? true };
      this.db.doctors.push(d);
    } else {
      d.name = input.name.trim();
      if (input.specialty !== undefined) d.specialty = input.specialty.trim();
      if (input.active !== undefined) d.active = input.active;
    }
    this.audit(actor, before ? "update" : "create", "doctor", d.id, before, { ...d });
    return d;
  }

  async savePaymentMethod(actor: Actor, input: Partial<Db["paymentMethods"][number]> & { name: string }) {
    assertCan(actor, "settings.manage");
    if (!input.name.trim()) throw new AppError("VALIDATION", "اسم طريقة الدفع مطلوب");
    let m = input.id ? this.db.paymentMethods.find((x) => x.id === input.id) : undefined;
    const before = m ? { ...m } : null;
    if (!m) {
      m = { id: this.newId("pm"), name: input.name.trim(), active: input.active ?? true };
      this.db.paymentMethods.push(m);
    } else {
      m.name = input.name.trim();
      if (input.active !== undefined) m.active = input.active;
    }
    if (!this.db.paymentMethods.some((x) => x.active)) throw new AppError("CONFLICT", "لازم تبقى طريقة دفع واحدة فعّالة على الأقل");
    this.audit(actor, before ? "update" : "create", "paymentMethod", m.id, before, { ...m });
    return m;
  }

  async saveUser(actor: Actor, input: { id?: string; name: string; username: string; role: "admin" | "receptionist"; active?: boolean; password?: string }) {
    assertCan(actor, "settings.manage");
    if (!input.name.trim() || !input.username.trim()) throw new AppError("VALIDATION", "الاسم واسم المستخدم مطلوبان");
    const username = input.username.trim().toLowerCase();
    if (this.db.users.some((u) => u.username.toLowerCase() === username && u.id !== input.id)) {
      throw new AppError("CONFLICT", "اسم المستخدم مستخدم مسبقًا");
    }
    let u = input.id ? this.db.users.find((x) => x.id === input.id) : undefined;
    if (u && u.id === actor.id && (input.active === false || input.role !== "admin")) {
      throw new AppError("CONFLICT", "لا يمكنك إيقاف حسابك أو تغيير صلاحيتك");
    }
    const before = u ? publicUser(u) : null;
    if (!u) {
      if (!input.password || input.password.length < 6) throw new AppError("VALIDATION", "كلمة المرور 6 أحرف على الأقل");
      u = { id: this.newId("u"), name: input.name.trim(), username, role: input.role, active: input.active ?? true, password: input.password };
      this.db.users.push(u);
    } else {
      u.name = input.name.trim();
      u.username = username;
      u.role = input.role;
      if (input.active !== undefined) u.active = input.active;
    }
    this.audit(actor, before ? "update" : "create", "user", u.id, before, publicUser(u));
    return publicUser(u);
  }

  async resetPassword(actor: Actor, userId: string) {
    assertCan(actor, "settings.manage");
    const u = this.db.users.find((x) => x.id === userId);
    if (!u) throw new AppError("NOT_FOUND", "المستخدم غير موجود");
    const temporaryPassword = `${Math.random().toString(36).slice(2, 6)}${Math.floor(1000 + Math.random() * 9000)}`;
    u.password = temporaryPassword;
    this.audit(actor, "resetPassword", "user", u.id, null, { username: u.username });
    return { temporaryPassword };
  }

  // ———— الاستيراد ————

  async validateImport(rows: ImportRow[]): Promise<ImportValidation> {
    const seen = new Map<number, number>();
    rows.forEach((r) => {
      if (r.fileNumber != null) seen.set(r.fileNumber, (seen.get(r.fileNumber) ?? 0) + 1);
    });
    const out = rows.map((row, index) => {
      const errors: string[] = [];
      if (!row.name?.trim()) errors.push("الاسم مطلوب");
      if (row.gender !== "male" && row.gender !== "female") errors.push("الجنس مطلوب (ذكر / أنثى)");
      if (!Number.isInteger(row.amount) || row.amount <= 0) errors.push("المبلغ يجب أن يكون رقمًا أكبر من صفر");
      if (row.age != null && (row.age < 0 || row.age > 120)) errors.push("العمر غير منطقي");
      if (row.fileNumber != null) {
        if (!Number.isInteger(row.fileNumber) || row.fileNumber <= 0) errors.push("رقم الملف غير صحيح");
        else if ((seen.get(row.fileNumber) ?? 0) > 1) errors.push(`رقم الملف ${row.fileNumber} مكرر داخل الملف`);
        else if (this.db.patients.some((p) => p.fileNumber === row.fileNumber)) errors.push(`رقم الملف ${row.fileNumber} موجود مسبقًا في النظام`);
      }
      return { index, row, errors };
    });
    const invalidCount = out.filter((r) => r.errors.length).length;
    return { rows: out, validCount: out.length - invalidCount, invalidCount };
  }

  async runImport(actor: Actor, rows: ImportRow[]) {
    assertCan(actor, "import.run");
    const v = await this.validateImport(rows);
    let imported = 0;
    let total = 0;
    // الأرقام اليدوية أولًا حتى لا يأخذها الترقيم التلقائي
    const valid = v.rows.filter((r) => !r.errors.length).sort((a, b) => (a.row.fileNumber == null ? 1 : 0) - (b.row.fileNumber == null ? 1 : 0));
    for (const { row } of valid) {
      const patient: Patient = {
        id: this.newId("p"),
        fileNumber: row.fileNumber ?? this.nextFileNumber(),
        name: row.name.trim(),
        gender: row.gender,
        birthYear: birthYearFromAge(row.age ?? null),
        phone: cleanPhone(row.phone),
        area: null,
        notes: null,
        createdAt: nowIso(),
        createdBy: actor.id,
      };
      this.db.patients.push(patient);
      this.db.openingBalances.push({
        id: this.newId("ob"),
        patientId: patient.id,
        amount: row.amount,
        currency: this.db.clinic.currency,
        note: cleanText(row.note) ?? "استيراد من الدفتر",
        createdAt: nowIso(),
        createdBy: actor.id,
        cancelled: false,
      });
      this.audit(actor, "import", "patient", patient.id, null, patient);
      imported++;
      total += row.amount;
    }
    return { imported, total };
  }

  async resetDemoData() {
    resetDb();
  }
}
