import { handler, parseBody } from "@/lib/server/http";
import { doctorSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo }) => (await repo.getSettings()).doctors, { action: "settings.manage" });
export const POST = handler(async ({ req, repo, actor }) => repo.saveDoctor(actor, await parseBody(req, doctorSchema)), { action: "settings.manage" });
