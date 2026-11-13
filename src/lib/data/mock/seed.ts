// بيانات تجريبية واقعية لعيادة أسنان يمنية. التواريخ نسبية لتاريخ التشغيل، فيبقى "اليوم" مليئًا دائمًا.
// المولّد العشوائي بـ seed ثابت، فالبيانات نفسها في كل تشغيل لنفس اليوم.

import { addDays, adenDateTimeToIso, currentYearAden, todayAden } from "../../domain/dates";
import type {
  AuditLog,
  Clinic,
  Doctor,
  OpeningBalance,
  Patient,
  Payment,
  PaymentMethod,
  Service,
  User,
  Visit,
  VisitService,
} from "../../types";

export interface Db {
  clinic: Clinic;
  users: User[];
  doctors: Doctor[];
  services: Service[];
  paymentMethods: PaymentMethod[];
  patients: Patient[];
  visits: Visit[];
  visitServices: VisitService[];
  payments: Payment[];
  openingBalances: OpeningBalance[];
  auditLogs: AuditLog[];
  counters: { visit: number; id: number };
  seededFor: string;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE_FIRST = ["محمد", "أحمد", "علي", "عبدالله", "خالد", "صالح", "عمر", "ياسر", "فهد", "حسن", "سعيد", "عبدالرحمن", "مراد", "وليد", "نبيل", "هاني"];
const FEMALE_FIRST = ["فاطمة", "مريم", "عائشة", "أمل", "سارة", "هدى", "نور", "رحاب", "أسماء", "خديجة", "سلمى", "منى", "ريم", "إيمان"];
const MIDDLE = ["محمد", "أحمد", "علي", "عبدالله", "صالح", "حسين", "قاسم", "ناصر", "يحيى", "عبده", "سالم", "مهدي"];
const FAMILY = ["الحميري", "العولقي", "الشرعبي", "باوزير", "الأهدل", "المقطري", "العبسي", "الصبري", "بن طالب", "الكثيري", "الحداد", "اليافعي", "الزبيدي", "الصلوي", "باشراحيل", "العمودي"];
const AREAS = ["كريتر", "المعلا", "التواهي", "الشيخ عثمان", "المنصورة", "خور مكسر", "البريقة", "دار سعد"];

export function createSeed(): Db {
  const today = todayAden();
  const rand = mulberry32(20261113);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  let idc = 1000;
  const id = (p: string) => `${p}_${(idc++).toString(36)}`;

  const clinic: Clinic = {
    id: "clinic_1",
    name: "عيادة الابتسامة لطب الأسنان",
    address: "عدن — المنصورة، شارع التسعين",
    phone: "02-345678 / 777123456",
    currency: "YER",
    fileNumberStart: 1001,
  };

  const users: User[] = [
    { id: "u_admin", name: "د. سعيد عبدالله", username: "admin", role: "admin", active: true, password: "admin123" },
    { id: "u_rec", name: "أمل محمد", username: "reception", role: "receptionist", active: true, password: "reception123" },
  ];

  const doctors: Doctor[] = [
    { id: "d_1", name: "د. خالد الحميري", specialty: "طب أسنان عام", active: true },
    { id: "d_2", name: "د. منى باوزير", specialty: "تقويم الأسنان", active: true },
    { id: "d_3", name: "د. ياسر العولقي", specialty: "جراحة الفم", active: true },
  ];

  const services: Service[] = [
    { id: "s_entry", name: "رسوم كشف", defaultPrice: 3000, active: true, isEntryFee: true },
    { id: "s_clean", name: "تنظيف وتلميع", defaultPrice: 10000, active: true, isEntryFee: false },
    { id: "s_fill", name: "حشوة تجميلية", defaultPrice: 15000, active: true, isEntryFee: false },
    { id: "s_amalgam", name: "حشوة عادية", defaultPrice: 8000, active: true, isEntryFee: false },
    { id: "s_extract", name: "خلع سن", defaultPrice: 7000, active: true, isEntryFee: false },
    { id: "s_surgical", name: "خلع جراحي", defaultPrice: 25000, active: true, isEntryFee: false },
    { id: "s_root", name: "علاج عصب", defaultPrice: 40000, active: true, isEntryFee: false },
    { id: "s_xray", name: "أشعة سنية", defaultPrice: 4000, active: true, isEntryFee: false },
    { id: "s_crown", name: "تلبيسة زيركون", defaultPrice: 60000, active: true, isEntryFee: false },
    { id: "s_whiten", name: "تبييض", defaultPrice: 50000, active: false, isEntryFee: false },
  ];

  const paymentMethods: PaymentMethod[] = [
    { id: "pm_cash", name: "نقد", active: true },
    { id: "pm_transfer", name: "تحويل", active: true },
    { id: "pm_jawali", name: "محفظة جوالي", active: true },
    { id: "pm_onecash", name: "محفظة ون كاش", active: true },
  ];

  const patients: Patient[] = [];
  const phones: string[] = [];
  const year = currentYearAden();
  for (let i = 0; i < 64; i++) {
    const gender = rand() < 0.55 ? "male" : "female";
    const first = gender === "male" ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const family = pick(FAMILY);
    const name = `${first} ${pick(MIDDLE)} ${pick(MIDDLE)} ${family}`;
    // أفراد العائلة يتشاركون الجوال أحيانًا
    let phone: string | null = null;
    if (i > 5 && rand() < 0.15 && phones.length) phone = pick(phones);
    else if (rand() < 0.9) {
      phone = `7${pick(["7", "3", "1", "0"])}${int(1000000, 9999999)}`;
      phones.push(phone);
    }
    const createdDate = addDays(today, -int(20, 200));
    patients.push({
      id: id("p"),
      fileNumber: clinic.fileNumberStart + i,
      name,
      gender,
      birthYear: rand() < 0.85 ? year - int(6, 70) : null,
      phone,
      area: rand() < 0.6 ? pick(AREAS) : null,
      notes: null,
      createdAt: adenDateTimeToIso(createdDate, 9, 0),
      createdBy: "u_rec",
    });
  }

  const visits: Visit[] = [];
  const visitServices: VisitService[] = [];
  const payments: Payment[] = [];
  let visitNo = 0;

  const addPayment = (p: Omit<Payment, "id" | "currency" | "cancelled" | "cancelReason" | "cancelledBy">) => {
    const pay: Payment = { ...p, id: id("pay"), currency: "YER", cancelled: false, cancelReason: null, cancelledBy: null };
    payments.push(pay);
    return pay;
  };

  const activeServices = services.filter((s) => s.active && !s.isEntryFee);

  // زيارات آخر 60 يومًا + اليوم + الأسبوع القادم
  for (let offset = -60; offset <= 7; offset++) {
    const date = addDays(today, offset);
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (dayOfWeek === 5 && offset !== 0) continue; // الجمعة إجازة (إلا اليوم حتى تبقى النسخة التجريبية مليئة)
    const count = offset === 0 ? 11 : offset > 0 ? int(1, 3) : int(1, 5);
    for (let k = 0; k < count; k++) {
      const patient = pick(patients);
      const doctor = pick(doctors);
      const hour = 9 + Math.floor((k * 9) / Math.max(count, 1));
      const minute = int(0, 59);
      const createdAt = adenDateTimeToIso(date, hour, minute);
      let status: Visit["status"];
      if (offset > 0) status = "scheduled";
      else if (offset === 0) status = k < 5 ? "completed" : k < 9 ? "open" : "scheduled";
      else status = rand() < 0.06 ? "cancelled" : rand() < 0.04 ? "open" : "completed";

      const v: Visit = {
        id: id("v"),
        number: ++visitNo,
        patientId: patient.id,
        doctorId: doctor.id,
        date,
        status,
        discount: 0,
        discountBy: null,
        currency: "YER",
        createdAt: offset > 0 ? adenDateTimeToIso(addDays(today, -int(0, 3)), 10, int(0, 59)) : createdAt,
        createdBy: "u_rec",
        checkedInAt: status === "scheduled" ? null : createdAt,
        closedAt: status === "completed" ? adenDateTimeToIso(date, Math.min(hour + 1, 22), minute) : null,
        cancelledAt: status === "cancelled" ? createdAt : null,
        cancelReason: status === "cancelled" ? pick(["لم يحضر المريض", "سُجلت بالخطأ", "طلب المريض التأجيل"]) : null,
        cancelledBy: status === "cancelled" ? "u_admin" : null,
        treatmentPlanId: null,
      };
      visits.push(v);
      if (status === "scheduled") continue;

      // رسوم الكشف + خدمة أو أكثر
      const chosen = [services[0]];
      const extra = int(0, 2);
      for (let e = 0; e < extra; e++) chosen.push(pick(activeServices));
      let total = 0;
      for (const s of chosen) {
        const price = s.defaultPrice;
        total += price;
        visitServices.push({
          id: id("vs"),
          visitId: v.id,
          serviceId: s.id,
          name: s.name,
          price,
          addedBy: rand() < 0.5 ? "u_rec" : "u_admin",
          addedAt: createdAt,
          cancelled: false,
          cancelReason: null,
        });
      }
      if (total > 20000 && rand() < 0.25) {
        v.discount = Math.round((total * pick([5, 10, 15])) / 100 / 500) * 500;
        v.discountBy = rand() < 0.5 ? "u_rec" : "u_admin";
      }
      if (status === "cancelled") continue;
      const net = total - v.discount;
      // نمط الدفع: كامل غالبًا، أحيانًا جزئي، وأحيانًا دين كامل
      const r = rand();
      const paid = r < 0.6 ? net : r < 0.85 ? Math.round((net * pick([0.3, 0.5, 0.7])) / 500) * 500 : 0;
      if (paid > 0) {
        addPayment({
          patientId: patient.id,
          visitId: v.id,
          kind: "visit",
          amount: paid,
          methodId: rand() < 0.65 ? "pm_cash" : pick(["pm_transfer", "pm_jawali", "pm_onecash"]),
          receiptNo: rand() < 0.4 ? String(int(1000, 9999)) : null,
          note: null,
          createdAt: v.closedAt ?? createdAt,
          createdBy: "u_rec",
        });
      }
    }
  }

  // سدادات لاحقة لبعض الديون
  for (const p of patients) {
    if (rand() < 0.25) {
      const daysAgo = int(0, 40);
      const date = addDays(today, -daysAgo);
      addPayment({
        patientId: p.id,
        visitId: null,
        kind: "settlement",
        amount: pick([5000, 10000, 15000, 20000]),
        methodId: pick(["pm_cash", "pm_cash", "pm_jawali", "pm_transfer"]),
        receiptNo: rand() < 0.5 ? String(int(1000, 9999)) : null,
        note: null,
        createdAt: adenDateTimeToIso(date, int(9, 20), int(0, 59)),
        createdBy: "u_rec",
      });
    }
  }

  // أرصدة افتتاحية من الدفتر القديم
  const openingBalances: OpeningBalance[] = [];
  for (const p of patients.slice(0, 64)) {
    if (rand() < 0.18) {
      openingBalances.push({
        id: id("ob"),
        patientId: p.id,
        amount: pick([10000, 15000, 25000, 40000, 60000]),
        currency: "YER",
        note: "منقول من الدفتر",
        createdAt: adenDateTimeToIso(addDays(today, -70), 9, 0),
        createdBy: "u_admin",
        cancelled: false,
      });
    }
  }

  // بعض الدفعات الملغاة للعرض
  const visitPays = payments.filter((p) => p.kind === "visit");
  for (let i = 0; i < 3 && visitPays.length; i++) {
    const p = visitPays[int(0, visitPays.length - 1)];
    if (p.cancelled) continue;
    p.cancelled = true;
    p.cancelReason = "أُدخلت بمبلغ خاطئ";
    p.cancelledBy = "u_admin";
  }

  return {
    clinic,
    users,
    doctors,
    services,
    paymentMethods,
    patients,
    visits,
    visitServices,
    payments,
    openingBalances,
    auditLogs: [],
    counters: { visit: visitNo, id: idc },
    seededFor: today,
  };
}
