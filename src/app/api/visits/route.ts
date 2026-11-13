import { handler, parseBody } from "@/lib/server/http";
import { todayAden } from "@/lib/domain/dates";
import { visitSchema } from "@/lib/schemas";
import type { VisitStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo, search }) =>
  repo.listVisits({
    date: search.get("date") || todayAden(),
    status: (search.get("status") as VisitStatus | null) || null,
    doctorId: search.get("doctorId") || null,
  }),
);

export const POST = handler(async ({ req, repo, actor }) => repo.createVisit(actor, await parseBody(req, visitSchema)), {
  action: "visit.create",
});
