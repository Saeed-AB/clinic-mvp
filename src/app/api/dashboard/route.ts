import { handler } from "@/lib/server/http";
import { todayAden } from "@/lib/domain/dates";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo, actor, search }) => repo.getDashboard(actor, search.get("date") || todayAden()));
