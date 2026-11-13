import { handler, parseBody } from "@/lib/server/http";
import { doctorSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** تعديل أو إيقاف (لا يوجد حذف) */
export const PATCH = handler<{ id: string }>(
  async ({ req, repo, actor, params }) => repo.saveDoctor(actor, { ...(await parseBody(req, doctorSchema)), id: params.id }),
  { action: "settings.manage" },
);
