// جدول الصلاحيات (القسم 4 من وثيقة المتطلبات).
// المسجل يغطي التسجيل اليومي كاملًا، والمدير وحده يعدّل أو يلغي بعد إغلاق الزيارة ويتحكم بالإعدادات.

import type { Role, VisitStatus } from "../types";

export type Action =
  | "patient.create"
  | "patient.edit"
  | "patient.editFileNumber"
  | "visit.create"
  | "visit.editServices"
  | "visit.discount"
  | "visit.pay"
  | "visit.close"
  | "visit.cancel"
  | "payment.cancel"
  | "openingBalance.add"
  | "debtors.view"
  | "debtors.export"
  | "closing.view"
  | "closing.anyDay"
  | "settings.manage"
  | "import.run";

const ADMIN_ONLY: Action[] = [
  "patient.editFileNumber",
  "visit.cancel",
  "openingBalance.add",
  "debtors.export",
  "closing.anyDay",
  "settings.manage",
  "import.run",
];

/** إجراءات على زيارة: بعد إغلاقها تصبح للمدير فقط */
const VISIT_SCOPED: Action[] = ["visit.editServices", "visit.discount", "visit.pay", "payment.cancel"];

export interface PermissionContext {
  visitStatus?: VisitStatus;
}

export function can(role: Role | undefined | null, action: Action, ctx: PermissionContext = {}): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  if (ADMIN_ONLY.includes(action)) return false;
  if (VISIT_SCOPED.includes(action) && ctx.visitStatus === "completed") return false;
  if (action === "payment.cancel" && ctx.visitStatus === undefined) return false;
  return true;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "مدير",
  receptionist: "مسجل",
};
