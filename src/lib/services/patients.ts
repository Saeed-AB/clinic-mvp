import { get, patch, post } from "../api/client";
import type { PatientFilter, PatientInput, PaymentInput } from "../data/repository";
import type { LedgerEntry, PatientSummary } from "../types";

export const patientsService = {
  list: (filter: PatientFilter) => get<{ rows: PatientSummary[]; total: number }>("/patients", filter as Record<string, unknown>),
  search: (q: string) => get<{ byFileNumber: PatientSummary | null; byPhone: PatientSummary[] }>("/patients/search", { q }),
  byPhone: (phone: string) => get<PatientSummary[]>("/patients/by-phone", { phone }),
  checkFileNumber: (n: number, exclude?: string) => get<{ taken: boolean; valid: boolean }>("/patients/check-file-number", { n, exclude }),
  create: (input: PatientInput) => post<PatientSummary>("/patients", input),
  update: (id: string, input: PatientInput) => patch<PatientSummary>(`/patients/${id}`, input),
  get: (id: string) => get<PatientSummary>(`/patients/${id}`),
  ledger: (id: string) => get<LedgerEntry[]>(`/patients/${id}/ledger`),
  settle: (id: string, input: PaymentInput) => post<PatientSummary>(`/patients/${id}/settlements`, input),
  addOpeningBalance: (id: string, input: { amount: number; note?: string | null }) =>
    post<PatientSummary>(`/patients/${id}/opening-balance`, input),
};
