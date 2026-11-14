// العقد الوحيد بين الـ API ومصدر البيانات.
// اليوم ينفذه MockRepository، ولاحقًا SupabaseRepository بنفس الدوال، والواجهة لا تتغير.

import type {
  BalanceIndicator,
  Clinic,
  DailyClosing,
  DashboardData,
  DebtorRow,
  Doctor,
  Gender,
  ImportRow,
  ImportValidation,
  LedgerEntry,
  PatientSummary,
  PaymentMethod,
  PublicUser,
  Role,
  Service,
  VisitDetails,
  VisitRow,
  VisitStatus,
} from "../types";

export class AppError extends Error {
  constructor(
    public code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION" | "UNAUTHORIZED",
    message: string,
  ) {
    super(message);
  }
}

export interface Actor {
  id: string;
  role: Role;
  name: string;
}

export interface PatientInput {
  name: string;
  gender: Gender;
  age?: number | null;
  phone?: string | null;
  area?: string | null;
  notes?: string | null;
  fileNumber?: number | null;
}

export interface PaymentInput {
  amount: number;
  methodId: string;
  receiptNo?: string | null;
  note?: string | null;
}

export interface VisitInput {
  patientId?: string | null;
  newPatient?: PatientInput | null;
  date: string;
  doctorId: string;
  services: { serviceId: string; price: number }[];
  payment?: PaymentInput | null;
}

export interface VisitFilter {
  date: string;
  status?: VisitStatus | null;
  doctorId?: string | null;
}

export interface DebtorFilter {
  q?: string | null;
  sort?: "amount" | "oldest" | null;
  inactiveDays?: number | null;
}

export interface PatientFilter {
  q?: string | null;
  gender?: Gender | null;
  indicator?: BalanceIndicator | null;
  sort?: "name" | "fileNumber" | "balance" | null;
}

export interface Settings {
  clinic: Clinic;
  services: Service[];
  doctors: Doctor[];
  paymentMethods: PaymentMethod[];
  users: PublicUser[];
}

export interface Lookups {
  clinic: Clinic;
  services: Service[];
  doctors: Doctor[];
  paymentMethods: PaymentMethod[];
  nextFileNumber: number;
}

export interface Repository {
  authenticate(username: string, password: string): Promise<PublicUser>;
  getUser(id: string): Promise<PublicUser | null>;

  getLookups(): Promise<Lookups>;
  getDashboard(actor: Actor, date: string): Promise<DashboardData>;

  searchPatients(q: string): Promise<{ byFileNumber: PatientSummary | null; byPhone: PatientSummary[] }>;
  listPatients(filter: PatientFilter): Promise<{ rows: PatientSummary[]; total: number }>;
  isFileNumberTaken(fileNumber: number, excludePatientId?: string): Promise<boolean>;
  createPatient(actor: Actor, input: PatientInput): Promise<PatientSummary>;
  updatePatient(actor: Actor, id: string, input: PatientInput): Promise<PatientSummary>;
  getPatient(id: string): Promise<PatientSummary>;
  getLedger(patientId: string): Promise<LedgerEntry[]>;
  addOpeningBalance(actor: Actor, patientId: string, input: { amount: number; note?: string | null }): Promise<PatientSummary>;
  addSettlement(actor: Actor, patientId: string, input: PaymentInput): Promise<PatientSummary>;

  listVisits(filter: VisitFilter): Promise<{ rows: VisitRow[]; summary: { count: number; open: number; collected: number } }>;
  createVisit(actor: Actor, input: VisitInput): Promise<VisitDetails>;
  getVisit(id: string): Promise<VisitDetails>;
  checkInVisit(actor: Actor, id: string): Promise<VisitDetails>;
  closeVisit(actor: Actor, id: string): Promise<VisitDetails>;
  cancelVisit(actor: Actor, id: string, reason: string): Promise<VisitDetails>;
  addVisitService(actor: Actor, visitId: string, input: { serviceId: string; price: number }): Promise<VisitDetails>;
  updateVisitService(actor: Actor, visitId: string, serviceRowId: string, input: { price: number }): Promise<VisitDetails>;
  cancelVisitService(actor: Actor, visitId: string, serviceRowId: string, reason: string): Promise<VisitDetails>;
  setDiscount(actor: Actor, visitId: string, input: { value: number; type: "amount" | "percent" }): Promise<VisitDetails>;
  addVisitPayment(actor: Actor, visitId: string, input: PaymentInput): Promise<VisitDetails>;
  cancelPayment(actor: Actor, paymentId: string, reason: string): Promise<{ patientId: string; visitId: string | null }>;

  listDebtors(filter: DebtorFilter): Promise<{ rows: DebtorRow[]; total: number; count: number }>;
  getDailyClosing(date: string): Promise<DailyClosing>;

  getSettings(): Promise<Settings>;
  updateClinic(actor: Actor, input: Partial<Omit<Clinic, "id">>): Promise<Clinic>;
  saveService(actor: Actor, input: Partial<Service> & { name: string; defaultPrice: number }): Promise<Service>;
  saveDoctor(actor: Actor, input: Partial<Doctor> & { name: string }): Promise<Doctor>;
  savePaymentMethod(actor: Actor, input: Partial<PaymentMethod> & { name: string }): Promise<PaymentMethod>;
  saveUser(actor: Actor, input: { id?: string; name: string; username: string; role: Role; active?: boolean; password?: string }): Promise<PublicUser>;
  resetPassword(actor: Actor, userId: string): Promise<{ temporaryPassword: string }>;

  validateImport(rows: ImportRow[]): Promise<ImportValidation>;
  runImport(actor: Actor, rows: ImportRow[]): Promise<{ imported: number; total: number }>;

  resetDemoData(): Promise<void>;
}
