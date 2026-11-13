import { get, patch, post } from "../api/client";
import type { PaymentInput, VisitInput } from "../data/repository";
import type { VisitDetails, VisitRow, VisitStatus } from "../types";

export const visitsService = {
  list: (params: { date: string; status?: VisitStatus | ""; doctorId?: string }) =>
    get<{ rows: VisitRow[]; summary: { count: number; open: number; collected: number } }>("/visits", params),
  create: (input: VisitInput) => post<VisitDetails>("/visits", input),
  get: (id: string) => get<VisitDetails>(`/visits/${id}`),
  checkIn: (id: string) => post<VisitDetails>(`/visits/${id}/check-in`),
  close: (id: string) => post<VisitDetails>(`/visits/${id}/close`),
  cancel: (id: string, reason: string) => post<VisitDetails>(`/visits/${id}/cancel`, { reason }),
  addService: (id: string, serviceId: string, price: number) => post<VisitDetails>(`/visits/${id}/services`, { serviceId, price }),
  updateService: (id: string, sid: string, price: number) => patch<VisitDetails>(`/visits/${id}/services/${sid}`, { price }),
  cancelService: (id: string, sid: string, reason: string) => post<VisitDetails>(`/visits/${id}/services/${sid}/cancel`, { reason }),
  setDiscount: (id: string, value: number, type: "amount" | "percent") => patch<VisitDetails>(`/visits/${id}/discount`, { value, type }),
  addPayment: (id: string, input: PaymentInput) => post<VisitDetails>(`/visits/${id}/payments`, input),
  cancelPayment: (paymentId: string, reason: string) =>
    post<{ patientId: string; visitId: string | null }>(`/payments/${paymentId}/cancel`, { reason }),
};
