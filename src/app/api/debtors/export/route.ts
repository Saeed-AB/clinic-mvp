import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** بيانات التصدير (المدير فقط). ملف الإكسل يُبنى في المتصفح من هذه البيانات */
export const GET = handler(
  async ({ repo, search }) =>
    repo.listDebtors({
      q: search.get("q"),
      sort: search.get("sort") === "oldest" ? "oldest" : "amount",
      inactiveDays: Number(search.get("inactiveDays")) || null,
    }),
  { action: "debtors.export" },
);
