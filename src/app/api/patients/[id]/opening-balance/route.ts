import { handler, parseBody } from "@/lib/server/http";
import { openingBalanceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string }>(
  async ({ req, repo, actor, params }) => repo.addOpeningBalance(actor, params.id, await parseBody(req, openingBalanceSchema)),
  { action: "openingBalance.add" },
);
