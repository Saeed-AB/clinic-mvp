// يحمي الصفحات: غير المسجل يذهب لصفحة الدخول، والمسجل لا يصل لصفحات المدير.
// يعمل على Edge، لذلك لا يستورد أي شيء من طبقة البيانات.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/session-token";

const ADMIN_PAGES = ["/settings", "/import"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (session.role !== "admin" && ADMIN_PAGES.some((p) => pathname.startsWith(p))) {
    const url = new URL("/", req.url);
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
