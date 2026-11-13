import { Badge } from "@/components/ui/badge";
import type { BalanceIndicator, VisitStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<VisitStatus, string> = {
  scheduled: "مجدولة",
  open: "مفتوحة",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

const statusClass: Record<VisitStatus, string> = {
  scheduled: "bg-scheduled-soft text-scheduled",
  open: "bg-open-soft text-open",
  completed: "bg-completed-soft text-completed",
  cancelled: "bg-cancelled-soft text-cancelled",
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return (
    <Badge className={statusClass[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export const INDICATOR_LABEL: Record<BalanceIndicator, string> = {
  debt: "عليه دين",
  settled: "خالص",
  credit: "له رصيد",
};

export const indicatorText: Record<BalanceIndicator, string> = {
  debt: "text-debt",
  settled: "text-settled",
  credit: "text-credit",
};

const indicatorClass: Record<BalanceIndicator, string> = {
  debt: "bg-debt-soft text-debt",
  settled: "bg-settled-soft text-settled",
  credit: "bg-credit-soft text-credit",
};

export function BalanceBadge({ indicator, className }: { indicator: BalanceIndicator; className?: string }) {
  return <Badge className={cn(indicatorClass[indicator], className)}>{INDICATOR_LABEL[indicator]}</Badge>;
}

export function CancelledBadge({ reason }: { reason?: string | null }) {
  return (
    <span title={reason ? `سبب الإلغاء: ${reason}` : undefined}>
      <Badge className="bg-cancelled-soft text-cancelled">ملغاة</Badge>
    </span>
  );
}
