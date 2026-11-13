import { AppError } from "@/lib/data/repository";
import { todayAden } from "@/lib/domain/dates";
import { can } from "@/lib/domain/permissions";
import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo, actor, search }) => {
  const today = todayAden();
  const date = search.get("date") || today;
  if (date !== today && !can(actor.role, "closing.anyDay")) {
    throw new AppError("FORBIDDEN", "المسجل يعرض إقفال اليوم فقط");
  }
  return repo.getDailyClosing(date);
});
