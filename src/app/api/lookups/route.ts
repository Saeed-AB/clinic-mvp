import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** القوائم اللي تحتاجها النوافذ: الأطباء، الخدمات، طرق الدفع، بيانات العيادة، رقم الملف التالي */
export const GET = handler(async ({ repo }) => repo.getLookups());
