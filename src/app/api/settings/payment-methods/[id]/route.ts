import { handler, parseBody } from "@/lib/server/http";
import { paymentMethodSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** تعديل أو إيقاف (لا يوجد حذف) */
export const PATCH = handler<{ id: string }>(
  async ({ req, repo, actor, params }) => repo.savePaymentMethod(actor, { ...(await parseBody(req, paymentMethodSchema)), id: params.id }),
  { action: "settings.manage" },
);
