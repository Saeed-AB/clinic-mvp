import { handler, parseBody } from "@/lib/server/http";
import { reasonSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string }>(
  async ({ req, repo, actor, params }) => repo.cancelVisit(actor, params.id, (await parseBody(req, reasonSchema)).reason),
  { action: "visit.cancel" },
);
