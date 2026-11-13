// كل التواريخ بتوقيت عدن (Asia/Aden = UTC+3 بدون توقيت صيفي).
// خوادم Netlify بتوقيت UTC، لذلك لا نستخدم new Date().getDate() مباشرة أبدًا.

export const TIME_ZONE = "Asia/Aden";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** تاريخ اليوم (أو أي لحظة) بصيغة YYYY-MM-DD بتوقيت عدن */
export function adenDate(at: Date | string = new Date()): string {
  return dayFmt.format(typeof at === "string" ? new Date(at) : at);
}

export function todayAden(): string {
  return adenDate(new Date());
}

/** يضيف أيامًا إلى تاريخ بصيغة YYYY-MM-DD */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** فرق الأيام بين تاريخين YYYY-MM-DD (b - a) */
export function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** لحظة ISO لتاريخ عدن ووقت محدد (ساعة ودقيقة بتوقيت عدن) */
export function adenDateTimeToIso(date: string, hour: number, minute: number): string {
  const [y, m, d] = date.split("-").map(Number);
  // عدن = UTC+3
  return new Date(Date.UTC(y, m - 1, d, hour - 3, minute)).toISOString();
}

/**
 * تحويل بين YYYY-MM-DD ومكوّن Date محلي، خاص بمكوّنات اختيار التاريخ على العميل (مثل Calendar)
 * فقط — تستخدم توقيت المتصفح المحلي عمدًا (لا عدن) لأن Date هنا تمثيل داخلي مؤقت لواجهة
 * الاختيار نفسها فقط، والقيمة الفعلية المرسلة للمنطق التجاري تبقى سلسلة YYYY-MM-DD بتوقيت عدن
 * (todayAden/addDays). لا تُستخدم هذه الدوال خارج مكوّنات العميل البصرية.
 */
export function ymdToDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentYearAden(): number {
  return Number(todayAden().slice(0, 4));
}

export function ageFromBirthYear(birthYear: number | null): number | null {
  if (birthYear == null) return null;
  return Math.max(0, currentYearAden() - birthYear);
}

export function birthYearFromAge(age: number | null | undefined): number | null {
  if (age == null || Number.isNaN(age)) return null;
  return currentYearAden() - age;
}
