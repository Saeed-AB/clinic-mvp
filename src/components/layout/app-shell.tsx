"use client";

import {
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  HandCoins,
  Home,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PatientDrawer } from "@/components/drawers/patient-drawer";
import { SettlementDrawer } from "@/components/drawers/settlement-drawer";
import { VisitDrawer } from "@/components/drawers/visit-drawer";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/domain/permissions";
import { authService } from "@/lib/services/auth";
import { cn } from "@/lib/utils";
import { useDrawers } from "@/stores/drawers";
import { useLookups } from "@/stores/lookups";
import { useSession } from "@/stores/session";

const NAV = [
  { href: "/", label: "الرئيسية", icon: Home, admin: false },
  { href: "/visits", label: "الزيارات", icon: CalendarDays, admin: false },
  { href: "/debtors", label: "المدينون والسداد", icon: HandCoins, admin: false },
  { href: "/daily-closing", label: "الإقفال اليومي", icon: ClipboardList, admin: false },
  { href: "/import", label: "استيراد الأرصدة", icon: FileSpreadsheet, admin: true },
  { href: "/settings", label: "الإعدادات", icon: Settings, admin: true },
];

function DeniedNotice() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (params.get("denied")) {
      toast.error("هذه الصفحة للمدير فقط");
      router.replace("/");
    }
  }, [params, router]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useSession();
  const clinic = useLookups((s) => s.data?.clinic);
  const loadLookups = useLookups((s) => s.load);
  const version = useDrawers((s) => s.version);
  const openDrawer = useDrawers((s) => s.openDrawer);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, [setUser]);

  useEffect(() => {
    loadLookups(version > 0);
  }, [loadLookups, version]);

  useEffect(() => setMobileOpen(false), [pathname]);

  async function logout() {
    await authService.logout().catch(() => null);
    setUser(null);
    router.replace("/login");
    router.refresh();
  }

  const items = NAV.filter((n) => !n.admin || user?.role === "admin");
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="القائمة الرئيسية" className="flex flex-col gap-1">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(n.href) ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors max-lg:h-11",
            isActive(n.href) ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <n.icon className="size-[18px]" aria-hidden />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const quickActions = (
    <div className="grid gap-2">
      <Button onClick={() => openDrawer("visit")} className="w-full justify-start">
        <CalendarDays /> زيارة جديدة
      </Button>
      <Button variant="outline" onClick={() => openDrawer("patient")} className="w-full justify-start">
        <UserPlus /> مريض جديد
      </Button>
    </div>
  );

  const userBox = (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/70 p-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user?.name ?? "…"}</p>
        <p className="text-xs text-muted-foreground">{user ? ROLE_LABEL[user.role] : ""}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج">
        <LogOut />
      </Button>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <Suspense>
        <DeniedNotice />
      </Suspense>
      <div className="no-print bg-warning-soft px-4 py-1.5 text-center text-xs text-warning">
        نسخة تجريبية — البيانات وهمية وقد ترجع لحالتها الأصلية في أي وقت
      </div>

      {/* شريط علوي للجوال والتابلت */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
          <Menu />
        </Button>
        <Link href="/" className="truncate font-semibold">
          {clinic?.name ?? "نظام العيادات"}
        </Link>
        <Button size="icon" onClick={() => openDrawer("visit")} aria-label="زيارة جديدة">
          <CalendarDays />
        </Button>
      </header>

      {/* قائمة الجوال */}
      {mobileOpen ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="anim-overlay absolute inset-0 bg-slate-900/40" data-state="open" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-4 bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{clinic?.name ?? "نظام العيادات"}</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة">
                <X />
              </Button>
            </div>
            {quickActions}
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {userBox}
          </div>
        </div>
      ) : null}

      <div className="flex">
        {/* الشريط الجانبي للشاشات الكبيرة */}
        <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-5 border-e border-border bg-surface p-4 lg:flex">
          <Link href="/" className="flex items-center gap-2.5 px-1">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
                <path d="M16 5c-3.6 0-6.8 1.8-6.8 5.9 0 2.7 1 4.1 1.6 7.1.6 3.3 1 7.4 2.6 7.4 1.5 0 1.4-4.1 2.6-4.1s1.1 4.1 2.6 4.1c1.6 0 2-4.1 2.6-7.4.6-3 1.6-4.4 1.6-7.1C22.8 6.8 19.6 5 16 5z" fill="currentColor" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{clinic?.name ?? "نظام العيادات"}</span>
              <span className="block text-xs text-muted-foreground">نظام العيادات</span>
            </span>
          </Link>
          {quickActions}
          <div className="flex-1 overflow-y-auto">{nav}</div>
          {userBox}
        </aside>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-5 sm:px-6 lg:py-7">{children}</main>
      </div>

      <VisitDrawer />
      <PatientDrawer />
      <SettlementDrawer />
    </div>
  );
}
