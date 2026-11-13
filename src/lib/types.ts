// أنواع الكيانات الأساسية للنظام. المبالغ أعداد صحيحة (بدون كسور)، والتواريخ بصيغة ISO.

export type Role = "admin" | "receptionist";
export type Gender = "male" | "female";
export type Currency = "YER" | "SAR" | "USD";
export type VisitStatus = "scheduled" | "open" | "completed" | "cancelled";
export type BalanceIndicator = "debt" | "settled" | "credit";

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  currency: Currency;
  fileNumberStart: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  /** في البيانات الوهمية فقط. مع Supabase تتولاها المصادقة. */
  password: string;
}

export type PublicUser = Omit<User, "password">;

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  defaultPrice: number;
  active: boolean;
  isEntryFee: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
}

export interface Patient {
  id: string;
  fileNumber: number;
  name: string;
  gender: Gender;
  /** يُدخل العمر وتُخزن سنة الميلاد المحسوبة */
  birthYear: number | null;
  phone: string | null;
  area: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

export interface Visit {
  id: string;
  number: number;
  patientId: string;
  doctorId: string;
  /** YYYY-MM-DD بتوقيت عدن */
  date: string;
  status: VisitStatus;
  /** الخصم مخزن كمبلغ على الزيارة كاملة */
  discount: number;
  discountBy: string | null;
  currency: Currency;
  createdAt: string;
  createdBy: string;
  checkedInAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  /** للإصدار القادم (خطط العلاج) */
  treatmentPlanId: string | null;
}

export interface VisitService {
  id: string;
  visitId: string;
  serviceId: string;
  /** الاسم والسعر منسوخان وقت الإضافة، فتغيير سعر الخدمة لاحقًا لا يؤثر */
  name: string;
  price: number;
  addedBy: string;
  addedAt: string;
  cancelled: boolean;
  cancelReason: string | null;
}

export type PaymentKind = "visit" | "settlement";

export interface Payment {
  id: string;
  patientId: string;
  /** دفعة مرتبطة بزيارة، أو null للسداد على الرصيد العام */
  visitId: string | null;
  kind: PaymentKind;
  amount: number;
  currency: Currency;
  methodId: string;
  receiptNo: string | null;
  note: string | null;
  createdAt: string;
  createdBy: string;
  cancelled: boolean;
  cancelReason: string | null;
  cancelledBy: string | null;
}

export interface OpeningBalance {
  id: string;
  patientId: string;
  amount: number;
  currency: Currency;
  note: string | null;
  createdAt: string;
  createdBy: string;
  cancelled: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  at: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
}

// ———— نماذج العرض (ما ترجعه الـ API) ————

export interface PatientSummary extends Patient {
  age: number | null;
  balance: number;
  indicator: BalanceIndicator;
}

export interface VisitRow {
  id: string;
  number: number;
  date: string;
  time: string;
  status: VisitStatus;
  patientId: string;
  patientName: string;
  fileNumber: number;
  doctorId: string;
  doctorName: string;
  total: number;
  paid: number;
  remaining: number;
}

export interface VisitServiceView extends VisitService {
  addedByName: string;
}

export interface PaymentView extends Payment {
  methodName: string;
  createdByName: string;
}

export interface VisitDetails {
  visit: Visit;
  patient: PatientSummary;
  doctor: Doctor;
  services: VisitServiceView[];
  payments: PaymentView[];
  totals: { services: number; discount: number; total: number; paid: number; remaining: number };
  createdByName: string;
  clinic: Clinic;
}

export type LedgerType = "visit" | "payment" | "settlement" | "opening";

export interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerType;
  doctorName: string | null;
  details: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  cancelled: boolean;
  cancelReason: string | null;
  visitId: string | null;
}

export interface DebtorRow {
  patientId: string;
  fileNumber: number;
  name: string;
  phone: string | null;
  balance: number;
  lastVisit: string | null;
  lastPayment: string | null;
}

export interface DashboardData {
  date: string;
  visitsCount: number;
  openCount: number;
  collected: number;
  newDebts: number;
  todayVisits: VisitRow[];
  admin?: { totalDebts: number; debtorsCount: number };
}

export interface DailyClosing {
  date: string;
  visitsCount: number;
  servicesTotal: number;
  discountsTotal: number;
  collected: number;
  collectedFromToday: number;
  collectedFromPrevious: number;
  newDebts: number;
  byMethod: { methodId: string; name: string; amount: number; count: number }[];
  discountsByUser: { userId: string; name: string; amount: number; count: number }[];
  byDoctor: { doctorId: string; name: string; visits: number; services: number }[];
  openVisits: VisitRow[];
  transactions: {
    id: string;
    time: string;
    type: "payment" | "settlement";
    patientId: string;
    patientName: string;
    fileNumber: number;
    amount: number;
    methodName: string;
    userName: string;
    cancelled: boolean;
  }[];
}

export interface ImportRow {
  fileNumber?: number | null;
  name: string;
  gender: Gender;
  age?: number | null;
  phone?: string | null;
  amount: number;
  note?: string | null;
}

export interface ImportValidation {
  rows: { index: number; row: ImportRow; errors: string[] }[];
  validCount: number;
  invalidCount: number;
}
