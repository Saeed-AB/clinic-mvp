import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { fail, ok, parseBody } from "@/lib/server/http";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/server/session-token";
import { loginSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await parseBody(req, loginSchema);
    const user = await getRepository().authenticate(username, password);
    const token = await signSession({ uid: user.id, role: user.role, name: user.name });
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return ok(user);
  } catch (e) {
    return fail(e);
  }
}
