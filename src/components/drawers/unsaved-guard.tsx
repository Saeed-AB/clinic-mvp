"use client";

import { ConfirmDialog } from "@/components/shared/cancel-dialog";

export function UnsavedGuard({ open, onOpenChange, onDiscard }: { open: boolean; onOpenChange: (v: boolean) => void; onDiscard: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تجاهل التغييرات؟"
      description="في بيانات مدخلة ما انحفظت. إذا أغلقت النافذة بتضيع."
      confirmLabel="تجاهل وإغلاق"
      danger
      onConfirm={onDiscard}
    />
  );
}
