"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** نافذة جانبية تنفتح من جهة البداية (يمين في العربية)، وبعرض كامل على الجوال */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-overlay fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          dir="rtl"
          className={cn(
            "anim-sheet fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-2xl outline-none sm:max-w-lg sm:border-s sm:border-border",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "نافذة"}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="-me-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-border bg-surface px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
