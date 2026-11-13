import { get } from "../api/client";
import type { DailyClosing, DashboardData, DebtorRow } from "../types";

export interface DebtorParams {
  q?: string;
  sort?: "amount" | "oldest";
  inactiveDays?: number | "";
}

export const reportsService = {
  dashboard: (date?: string) => get<DashboardData>("/dashboard", date ? { date } : undefined),
  debtors: (params: DebtorParams) => get<{ rows: DebtorRow[]; total: number; count: number }>("/debtors", params as Record<string, unknown>),
  debtorsExport: (params: DebtorParams) =>
    get<{ rows: DebtorRow[]; total: number; count: number }>("/debtors/export", params as Record<string, unknown>),
  dailyClosing: (date: string) => get<DailyClosing>("/daily-closing", { date }),
};
