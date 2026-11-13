import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** المرضى المرتبطون بجوال (تنبيه عند إضافة مريض بجوال مسجل) */
export const GET = handler(async ({ repo, search }) => {
  const phone = (search.get("phone") ?? "").replace(/[^\d]/g, "");
  if (phone.length < 6) return [];
  return (await repo.searchPatients(phone)).byPhone;
});
