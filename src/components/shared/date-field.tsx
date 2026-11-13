"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateToYmd, todayAden, ymdToDate } from "@/lib/domain/dates";
import { formatDate, formatWeekday } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/** منتقي تاريخ واحد (Popover + Calendar من shadcn) بدل input[type=date] الأصلي للمتصفح */
export function DateField({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
}: {
  value: string;
  onChange: (d: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = todayAden();
  const isToday = value === today;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-start gap-2 font-normal", className)}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="truncate">
            {isToday ? "اليوم" : formatWeekday(value)}
            <span className="text-muted-foreground"> · {formatDate(value)}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          selected={ymdToDate(value)}
          defaultMonth={ymdToDate(value)}
          onSelect={(d) => {
            if (!d) return;
            onChange(dateToYmd(d));
            setOpen(false);
          }}
          disabled={(d) => {
            const ymd = dateToYmd(d);
            if (min && ymd < min) return true;
            if (max && ymd > max) return true;
            return false;
          }}
        />
        {!isToday ? (
          <div className="border-t border-border pt-2 text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              الرجوع لليوم
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
