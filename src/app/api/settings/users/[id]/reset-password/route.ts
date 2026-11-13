import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string }>(async ({ repo, actor, params }) => repo.resetPassword(actor, params.id), {
  action: "settings.manage",
});
