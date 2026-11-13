"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-1 text-sm text-muted-foreground">بياناتك المحفوظة سليمة. جرّب مرة أخرى، وإذا تكرر الخطأ حدّث الصفحة.</p>
      <button onClick={reset} className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
        إعادة المحاولة
      </button>
    </main>
  );
}
