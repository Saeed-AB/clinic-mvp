import { handler, parseBody } from "@/lib/server/http";
import { discountSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** الخصم على الزيارة كاملة: مبلغ أو نسبة، ويُخزن كمبلغ */
export const PATCH = handler<{ id: string }>(async ({ req, repo, actor, params }) =>
  repo.setDiscount(actor, params.id, await parseBody(req, discountSchema)),
);
