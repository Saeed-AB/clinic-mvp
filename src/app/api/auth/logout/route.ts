import { cookies } from "next/headers";
import { ok } from "@/lib/server/http";
import { SESSION_COOKIE } from "@/lib/server/session-token";

export const dynamic = "force-dynamic";

export async function POST() {
  (await cookies()).delete(SESSION_COOKIE);
  return ok({ loggedOut: true });
}
