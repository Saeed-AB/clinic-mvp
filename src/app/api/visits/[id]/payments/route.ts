import { handler, parseBody } from "@/lib/server/http";
import { paymentSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string }>(async ({ req, repo, actor, params }) =>
  repo.addVisitPayment(actor, params.id, await parseBody(req, paymentSchema)),
);
