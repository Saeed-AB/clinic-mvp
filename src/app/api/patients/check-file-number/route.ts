import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ repo, search }) => {
  const n = Number(search.get("n"));
  if (!Number.isInteger(n) || n <= 0) return { taken: false, valid: false };
  return { taken: await repo.isFileNumberTaken(n, search.get("exclude") ?? undefined), valid: true };
});
