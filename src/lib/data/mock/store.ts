// مخزن في الذاكرة على globalThis (حتى لا يضيع مع إعادة التحميل أثناء التطوير).
// على Netlify يعيش ما دامت الدالة دافئة، ثم يرجع للبيانات الأصلية — مقبول للنسخة التجريبية.

import { todayAden } from "../../domain/dates";
import { createSeed, type Db } from "./seed";

const g = globalThis as unknown as { __clinicDb?: Db };

export function getDb(): Db {
  // إعادة الزرع عند بداية يوم جديد حتى تبقى بيانات "اليوم" منطقية
  if (!g.__clinicDb || g.__clinicDb.seededFor !== todayAden()) {
    g.__clinicDb = createSeed();
  }
  return g.__clinicDb;
}

export function resetDb(): Db {
  g.__clinicDb = createSeed();
  return g.__clinicDb;
}
