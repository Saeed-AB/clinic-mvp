import { handler, parseBody } from "@/lib/server/http";
import { serviceLineSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string }>(async ({ req, repo, actor, params }) =>
  repo.addVisitService(actor, params.id, await parseBody(req, serviceLineSchema)),
);
