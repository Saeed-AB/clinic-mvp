import { handler, parseBody } from "@/lib/server/http";
import { paymentSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** سداد على الرصيد العام للمريض (غير مرتبط بزيارة) */
export const POST = handler<{ id: string }>(async ({ req, repo, actor, params }) =>
  repo.addSettlement(actor, params.id, await parseBody(req, paymentSchema)),
);
