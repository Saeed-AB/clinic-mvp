import type { Currency } from "../types";

export const CURRENCY_LABEL: Record<Currency, string> = { YER: "ريال يمني", SAR: "ريال سعودي", USD: "دولار" };
export const CURRENCY_SHORT: Record<Currency, string> = { YER: "ر.ي", SAR: "ر.س", USD: "$" };

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** أرقام لاتينية مع فواصل الآلاف */
export function formatNumber(n: number | null | undefined): string {
  return nf.format(n ?? 0);
}

export function formatMoney(n: number | null | undefined, currency: Currency = "YER"): string {
  return `${nf.format(n ?? 0)} ${CURRENCY_SHORT[currency]}`;
}

/** يحوّل الأرقام العربية-الهندية إلى لاتينية (عند الكتابة من لوحة مفاتيح عربية) */
export function toLatinDigits(v: string): string {
  return v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

export function parseAmount(v: string): number {
  const n = Number(toLatinDigits(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
