import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo, search }) =>
  repo.listDebtors({
    q: search.get("q"),
    sort: search.get("sort") === "oldest" ? "oldest" : "amount",
    inactiveDays: Number(search.get("inactiveDays")) || null,
  }),
);
