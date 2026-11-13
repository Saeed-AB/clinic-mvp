import { handler } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler<{ id: string }>(async ({ repo, params }) => repo.getVisit(params.id));
