import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="num text-6xl font-bold text-primary">404</p>
      <h1 className="mt-3 text-xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-1 text-sm text-muted-foreground">ربما تغيّر الرابط أو حُذف. ارجع للرئيسية وابدأ من هناك.</p>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
        الرجوع للرئيسية
      </Link>
    </main>
  );
}
