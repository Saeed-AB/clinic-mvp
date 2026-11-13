"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { errorMessage } from "@/lib/api/client";

/** إلغاء موحّد لأي عملية: السبب إجباري، والعملية الملغاة تبقى ظاهرة */
export function CancelWithReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (reason.trim().length < 3) {
      setError("اذكر سبب الإلغاء (3 أحرف على الأقل)");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description ?? "لا يوجد حذف نهائي. العملية الملغاة تبقى ظاهرة بعلامة \"ملغاة\" مع السبب."}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            تراجع
          </Button>
          <Button variant="danger" loading={busy} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label="سبب الإلغاء" htmlFor="cancel-reason" required error={error ?? undefined}>
        <Textarea
          id="cancel-reason"
          autoFocus
          value={reason}
          aria-invalid={!!error}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder="مثال: سُجلت بالخطأ"
        />
      </Field>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) setError(null);
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            تراجع
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg bg-debt-soft px-3 py-2 text-sm text-debt">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
