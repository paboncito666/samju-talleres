import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
