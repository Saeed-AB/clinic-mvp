import { handler, parseBody } from "@/lib/server/http";
import { serviceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** تعديل أو إيقاف (لا يوجد حذف) */
export const PATCH = handler<{ id: string }>(
  async ({ req, repo, actor, params }) => repo.saveService(actor, { ...(await parseBody(req, serviceSchema)), id: params.id }),
  { action: "settings.manage" },
);
