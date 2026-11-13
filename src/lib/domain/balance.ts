// قواعد المال في النظام — دوال نقية بدون أي اعتماد على الواجهة أو مصدر البيانات.
//
// رصيد المريض = إجمالي الزيارات (المفتوحة والمكتملة) + الرصيد الافتتاحي − إجمالي المدفوعات
// الزيارة المجدولة والملغاة لا تدخل الرصيد، والخدمات والدفعات الملغاة لا تُحسب.

import type {
  BalanceIndicator,
  LedgerEntry,
  OpeningBalance,
  Payment,
  Visit,
  VisitService,
} from "../types";

export function countsInBalance(visit: Pick<Visit, "status">): boolean {
  return visit.status === "open" || visit.status === "completed";
}

export function servicesTotal(services: VisitService[]): number {
  return services.filter((s) => !s.cancelled).reduce((sum, s) => sum + s.price, 0);
}

/** الخصم لا يتجاوز إجمالي الخدمات (حد أقصى 100%) */
export function clampDiscount(discount: number, total: number): number {
  return Math.max(0, Math.min(Math.round(discount), total));
}

/** يحوّل خصمًا مُدخلًا كنسبة أو مبلغ إلى مبلغ */
export function discountToAmount(value: number, type: "amount" | "percent", total: number): number {
  const raw = type === "percent" ? (total * Math.min(Math.max(value, 0), 100)) / 100 : value;
  return clampDiscount(raw, total);
}

export function visitTotal(visit: Pick<Visit, "discount">, services: VisitService[]): number {
  const s = servicesTotal(services);
  return s - clampDiscount(visit.discount, s);
}

export function activePayments(payments: Payment[]): Payment[] {
  return payments.filter((p) => !p.cancelled);
}

export function paymentsTotal(payments: Payment[]): number {
  return activePayments(payments).reduce((sum, p) => sum + p.amount, 0);
}

export interface PatientMoney {
  visits: Visit[];
  services: VisitService[];
  payments: Payment[];
  openings: OpeningBalance[];
}

export function patientBalance({ visits, services, payments, openings }: PatientMoney): number {
  const byVisit = groupBy(services, (s) => s.visitId);
  const visitsSum = visits
    .filter(countsInBalance)
    .reduce((sum, v) => sum + visitTotal(v, byVisit.get(v.id) ?? []), 0);
  const openingSum = openings.filter((o) => !o.cancelled).reduce((sum, o) => sum + o.amount, 0);
  return visitsSum + openingSum - paymentsTotal(payments);
}

export function balanceIndicator(balance: number): BalanceIndicator {
  if (balance > 0) return "debt";
  if (balance < 0) return "credit";
  return "settled";
}

export interface LedgerContext extends PatientMoney {
  doctorName: (doctorId: string) => string;
  methodName: (methodId: string) => string;
}

/** سجل الحركات مع الرصيد بعد كل حركة، مرتب من الأحدث للأقدم */
export function buildLedger(ctx: LedgerContext): LedgerEntry[] {
  const byVisit = groupBy(ctx.services, (s) => s.visitId);
  const visitNo = new Map(ctx.visits.map((v) => [v.id, v.number]));
  type Raw = Omit<LedgerEntry, "balanceAfter"> & { sortKey: string };
  const raw: Raw[] = [];

  for (const v of ctx.visits) {
    if (v.status === "scheduled") continue;
    const services = (byVisit.get(v.id) ?? []).filter((s) => !s.cancelled);
    const names = services.map((s) => s.name).join("، ");
    raw.push({
      id: v.id,
      date: v.checkedInAt ?? v.createdAt,
      sortKey: `${v.date}|${v.checkedInAt ?? v.createdAt}`,
      type: "visit",
      doctorName: ctx.doctorName(v.doctorId),
      details: `زيارة رقم ${v.number}${names ? ` — ${names}` : ""}${v.discount > 0 ? ` (خصم ${v.discount.toLocaleString("en-US")})` : ""}`,
      debit: v.status === "cancelled" ? 0 : visitTotal(v, services),
      credit: 0,
      cancelled: v.status === "cancelled",
      cancelReason: v.cancelReason,
      visitId: v.id,
    });
  }
  for (const p of ctx.payments) {
    const isSettlement = p.kind === "settlement";
    raw.push({
      id: p.id,
      date: p.createdAt,
      sortKey: `${p.createdAt.slice(0, 10)}|${p.createdAt}`,
      type: isSettlement ? "settlement" : "payment",
      doctorName: null,
      details: `${isSettlement ? "سداد" : `دفعة على زيارة ${visitNo.get(p.visitId ?? "") ?? ""}`} — ${ctx.methodName(p.methodId)}${p.receiptNo ? ` — سند ${p.receiptNo}` : ""}`,
      debit: 0,
      credit: p.cancelled ? 0 : p.amount,
      cancelled: p.cancelled,
      cancelReason: p.cancelReason,
      visitId: p.visitId,
    });
  }
  for (const o of ctx.openings) {
    raw.push({
      id: o.id,
      date: o.createdAt,
      sortKey: `0000|${o.createdAt}`,
      type: "opening",
      doctorName: null,
      details: `رصيد افتتاحي${o.note ? ` — ${o.note}` : ""}`,
      debit: o.cancelled ? 0 : o.amount,
      credit: 0,
      cancelled: o.cancelled,
      cancelReason: null,
      visitId: null,
    });
  }

  raw.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  let running = 0;
  const withBalance: LedgerEntry[] = raw.map(({ sortKey: _k, ...e }) => {
    running += e.debit - e.credit;
    return { ...e, balanceAfter: running };
  });
  return withBalance.reverse();
}

export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
