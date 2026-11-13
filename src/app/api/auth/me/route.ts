import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async ({ actor, repo }) => repo.getUser(actor.id));
