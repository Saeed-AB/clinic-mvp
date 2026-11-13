import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** البحث برقم الملف أو الجوال فقط */
export const GET = handler(async ({ repo, search }) => repo.searchPatients(search.get("q") ?? ""));
