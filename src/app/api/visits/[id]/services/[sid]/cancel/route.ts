import { handler, parseBody } from "@/lib/server/http";
import { reasonSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string; sid: string }>(async ({ req, repo, actor, params }) =>
  repo.cancelVisitService(actor, params.id, params.sid, (await parseBody(req, reasonSchema)).reason),
);
