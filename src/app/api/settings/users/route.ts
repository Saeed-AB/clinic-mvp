import { handler, parseBody } from "@/lib/server/http";
import { userSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo }) => (await repo.getSettings()).users, { action: "settings.manage" });
export const POST = handler(async ({ req, repo, actor }) => repo.saveUser(actor, await parseBody(req, userSchema)), { action: "settings.manage" });
