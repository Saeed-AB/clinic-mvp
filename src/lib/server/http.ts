// أدوات مشتركة لكل Route Handlers: الجلسة، التحقق، الصلاحية، وتوحيد شكل الرد والأخطاء.

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { getRepository } from "../data";
import { AppError, type Actor, type Repository } from "../data/repository";
import { can, type Action } from "../domain/permissions";
import { SESSION_COOKIE, verifySession } from "./session-token";

const STATUS: Record<AppError["code"], number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(error: unknown) {
  if (error instanceof AppError) {
    const res = NextResponse.json({ error: { code: error.code, message: error.message } }, { status: STATUS[error.code] });
    // جلسة لمستخدم موقوف أو غير موجود: نحذفها حتى لا يدور المتصفح بين /login و /
    if (error.code === "UNAUTHORIZED") res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION", message: first?.message ?? "بيانات غير صحيحة", issues: error.issues } },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: { code: "SERVER", message: "حدث خطأ غير متوقع، حاول مرة أخرى" } }, { status: 500 });
}

/** تأخير صناعي بسيط مع البيانات الوهمية، حتى تظهر حالات التحميل كما ستكون مع خادم حقيقي */
async function mockLatency() {
  if ((process.env.DATA_SOURCE ?? "mock") === "mock") {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
  }
}

export async function currentActor(): Promise<Actor | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await getRepository().getUser(session.uid);
  if (!user) return null;
  return { id: user.id, role: user.role, name: user.name };
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError("VALIDATION", "صيغة الطلب غير صحيحة");
  }
  return schema.parse(json);
}

export interface HandlerArgs<P> {
  req: NextRequest;
  params: P;
  actor: Actor;
  repo: Repository;
  search: URLSearchParams;
}

/**
 * يغلّف أي Route Handler: يتحقق من الجلسة، ومن الصلاحية العامة إن وُجدت، ويوحّد الأخطاء.
 * الصلاحيات المرتبطة بحالة الزيارة تُفحص داخل الـ Repository.
 */
export function handler<P = Record<string, string>>(
  fn: (args: HandlerArgs<P>) => Promise<unknown>,
  options: { action?: Action } = {},
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      await mockLatency();
      const actor = await currentActor();
      if (!actor) throw new AppError("UNAUTHORIZED", "انتهت الجلسة، سجّل الدخول مرة أخرى");
      if (options.action && !can(actor.role, options.action)) throw new AppError("FORBIDDEN", "هذه العملية للمدير فقط");
      const params = ((await ctx?.params) ?? {}) as P;
      const result = await fn({ req, params, actor, repo: getRepository(), search: req.nextUrl.searchParams });
      return result instanceof Response ? result : ok(result);
    } catch (e) {
      return fail(e);
    }
  };
}
