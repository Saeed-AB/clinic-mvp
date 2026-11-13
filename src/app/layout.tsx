import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "نظام العيادات", template: "%s · نظام العيادات" },
  description: "تسجيل زيارات المرضى ومدفوعاتهم ومتابعة الديون",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster dir="rtl" position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-plex-arabic)" } }} />
      </body>
    </html>
  );
}
