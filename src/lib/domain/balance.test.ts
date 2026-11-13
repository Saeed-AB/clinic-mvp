import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceIndicator, buildLedger, discountToAmount, patientBalance, visitTotal } from "./balance";
import { can } from "./permissions";
import type { OpeningBalance, Payment, Visit, VisitService } from "../types";

const visit = (id: string, status: Visit["status"], discount = 0, date = "2026-11-01"): Visit => ({
  id, number: 1, patientId: "p", doctorId: "d", date, status, discount, discountBy: null, currency: "YER",
  createdAt: `${date}T08:00:00.000Z`, createdBy: "u", checkedInAt: `${date}T08:00:00.000Z`, closedAt: null,
  cancelledAt: null, cancelReason: null, cancelledBy: null, treatmentPlanId: null,
});
const svc = (visitId: string, price: number, cancelled = false): VisitService => ({
  id: `${visitId}-${price}`, visitId, serviceId: "s", name: "خدمة", price, addedBy: "u", addedAt: "", cancelled, cancelReason: null,
});
const pay = (amount: number, cancelled = false, visitId: string | null = "v1"): Payment => ({
  id: `pay${amount}${cancelled}`, patientId: "p", visitId, kind: visitId ? "visit" : "settlement", amount, currency: "YER",
  methodId: "m", receiptNo: null, note: null, createdAt: "2026-11-02T08:00:00.000Z", createdBy: "u", cancelled, cancelReason: null, cancelledBy: null,
});
const ob = (amount: number): OpeningBalance => ({ id: "ob", patientId: "p", amount, currency: "YER", note: null, createdAt: "2026-10-01T00:00:00.000Z", createdBy: "u", cancelled: false });

test("open visit forgotten by reception still counts as debt", () => {
  assert.equal(patientBalance({ visits: [visit("v1", "open")], services: [svc("v1", 10000)], payments: [], openings: [] }), 10000);
});
test("scheduled and cancelled visits are excluded", () => {
  const b = patientBalance({ visits: [visit("v1", "scheduled"), visit("v2", "cancelled")], services: [svc("v1", 5000), svc("v2", 7000)], payments: [], openings: [] });
  assert.equal(b, 0);
});
test("balance formula with opening balance and payments", () => {
  const b = patientBalance({ visits: [visit("v1", "completed", 2000)], services: [svc("v1", 10000), svc("v1", 3000, true)], payments: [pay(5000)], openings: [ob(15000)] });
  assert.equal(b, 10000 - 2000 + 15000 - 5000);
});
test("overpayment gives credit; cancelling a payment restores debt", () => {
  const base = { visits: [visit("v1", "completed")], services: [svc("v1", 10000)], openings: [] };
  assert.equal(balanceIndicator(patientBalance({ ...base, payments: [pay(12000)] })), "credit");
  assert.equal(patientBalance({ ...base, payments: [pay(12000, true)] }), 10000);
});
test("discount as percent or amount, capped at 100%", () => {
  assert.equal(discountToAmount(10, "percent", 20000), 2000);
  assert.equal(discountToAmount(150, "percent", 20000), 20000);
  assert.equal(discountToAmount(25000, "amount", 20000), 20000);
  assert.equal(visitTotal({ discount: 99999 }, [svc("v1", 5000)]), 0);
});
test("ledger running balance matches patient balance", () => {
  const data = { visits: [visit("v1", "completed")], services: [svc("v1", 10000)], payments: [pay(4000), pay(1000, false, null)], openings: [ob(3000)] };
  const ledger = buildLedger({ ...data, doctorName: () => "د", methodName: () => "نقد" });
  assert.equal(ledger[0].balanceAfter, patientBalance(data));
  assert.equal(ledger[ledger.length - 1].type, "opening");
});
test("permissions: reception cannot edit after close", () => {
  assert.equal(can("receptionist", "visit.pay", { visitStatus: "open" }), true);
  assert.equal(can("receptionist", "visit.pay", { visitStatus: "completed" }), false);
  assert.equal(can("receptionist", "payment.cancel", { visitStatus: "completed" }), false);
  assert.equal(can("receptionist", "visit.cancel"), false);
  assert.equal(can("admin", "payment.cancel", { visitStatus: "completed" }), true);
  assert.equal(can("receptionist", "closing.anyDay"), false);
});
