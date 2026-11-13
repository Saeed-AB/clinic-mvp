import { handler, parseBody } from "@/lib/server/http";
import { priceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const PATCH = handler<{ id: string; sid: string }>(async ({ req, repo, actor, params }) =>
  repo.updateVisitService(actor, params.id, params.sid, await parseBody(req, priceSchema)),
);
