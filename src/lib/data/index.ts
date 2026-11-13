import { MockRepository } from "./mock/mock-repository";
import type { Repository } from "./repository";

let instance: Repository | null = null;

/** نقطة التبديل الوحيدة: DATA_SOURCE=mock اليوم، و supabase لاحقًا */
export function getRepository(): Repository {
  if (instance) return instance;
  const source = process.env.DATA_SOURCE ?? "mock";
  if (source === "mock") {
    instance = new MockRepository();
    return instance;
  }
  throw new Error(`مصدر البيانات "${source}" غير منفذ بعد. استخدم DATA_SOURCE=mock`);
}
