import { handler, parseBody } from "@/lib/server/http";
import { serviceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo }) => (await repo.getSettings()).services, { action: "settings.manage" });
export const POST = handler(async ({ req, repo, actor }) => repo.saveService(actor, await parseBody(req, serviceSchema)), { action: "settings.manage" });
