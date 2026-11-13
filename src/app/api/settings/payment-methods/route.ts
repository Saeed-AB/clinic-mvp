import { handler, parseBody } from "@/lib/server/http";
import { paymentMethodSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo }) => (await repo.getSettings()).paymentMethods, { action: "settings.manage" });
export const POST = handler(async ({ req, repo, actor }) => repo.savePaymentMethod(actor, await parseBody(req, paymentMethodSchema)), { action: "settings.manage" });
