import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  actions,
  children,
  ...props
}: ComponentProps<"div"> & { title?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  // توافق مع نمط title/description/actions المختصر، بالإضافة إلى التركيب الحر (CardTitle/CardDescription/CardAction)
  if (title !== undefined || description !== undefined || actions !== undefined) {
    return (
      <div data-slot="card-header" className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5", className)} {...props}>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </div>
    );
  }
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("text-base font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("mt-0.5 text-sm text-muted-foreground", className)} {...props} />;
}

export function CardAction({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2 border-t border-border px-4 py-3 sm:px-5", className)} {...props} />;
}
