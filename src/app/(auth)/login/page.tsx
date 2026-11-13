import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
              <path d="M16 5c-3.6 0-6.8 1.8-6.8 5.9 0 2.7 1 4.1 1.6 7.1.6 3.3 1 7.4 2.6 7.4 1.5 0 1.4-4.1 2.6-4.1s1.1 4.1 2.6 4.1c1.6 0 2-4.1 2.6-7.4.6-3 1.6-4.4 1.6-7.1C22.8 6.8 19.6 5 16 5z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">نظام العيادات</h1>
          <p className="mt-1 text-sm text-muted-foreground">سجّل دخولك لمتابعة زيارات اليوم</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
