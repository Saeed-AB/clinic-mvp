import { handler, parseBody } from "@/lib/server/http";
import { clinicSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo }) => (await repo.getSettings()).clinic, { action: "settings.manage" });
export const PATCH = handler(async ({ req, repo, actor }) => repo.updateClinic(actor, await parseBody(req, clinicSchema)), {
  action: "settings.manage",
});
