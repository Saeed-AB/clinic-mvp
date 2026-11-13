import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

// الصفحات تعتمد على تاريخ اليوم بتوقيت عدن، فلا تُبنى مسبقًا وقت البناء
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
