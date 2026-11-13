"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
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
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="anim-overlay fixed inset-0 z-[60] bg-slate-900/40" />
        <DialogPrimitive.Content
          dir="rtl"
          className={cn(
            "anim-dialog fixed top-1/2 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface shadow-2xl outline-none",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "نافذة"}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="-me-2 -mt-1 rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="إغلاق">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          {children ? <div className="px-5 pt-4">{children}</div> : null}
          {footer ? <div className="flex flex-wrap justify-end gap-2 px-5 pt-5 pb-5">{footer}</div> : <div className="pb-5" />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
