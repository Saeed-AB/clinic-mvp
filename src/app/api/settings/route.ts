import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo }) => repo.getSettings(), { action: "settings.manage" });
