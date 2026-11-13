import { TIME_ZONE } from "../domain/dates";

export { todayAden, addDays, adenDate } from "../domain/dates";

const dateFmt = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { timeZone: "UTC", weekday: "long" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });

const asUtc = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`);

/** 13 نوفمبر 2026 */
export function formatDate(d: string | null | undefined): string {
  return d ? dateFmt.format(asUtc(d)) : "—";
}
/** 13/11/2026 */
export function formatShortDate(d: string | null | undefined): string {
  return d ? shortFmt.format(asUtc(d)) : "—";
}
export function formatWeekday(d: string): string {
  return weekdayFmt.format(asUtc(d));
}
/** لحظة ISO بتوقيت عدن: 13/11/2026, 14:05 */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFmt.format(new Date(iso)).replace(",", " —") : "—";
}
export function formatTime(iso: string | null | undefined): string {
  return iso ? timeFmt.format(new Date(iso)) : "—";
}
