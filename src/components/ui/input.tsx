import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none max-sm:h-11",
        "placeholder:text-muted-foreground/70 transition-colors selection:bg-primary selection:text-primary-foreground",
        "file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        "aria-[invalid=true]:border-debt aria-[invalid=true]:ring-debt/15",
        className,
      )}
      {...props}
    />
  );
});
