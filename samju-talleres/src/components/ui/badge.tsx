import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  neutral: "bg-surface-muted text-foreground",
  sage: "bg-sage text-sage-foreground",
  blue: "bg-blue text-blue-foreground",
  amber: "bg-amber text-amber-foreground",
  rose: "bg-rose text-rose-foreground",
  lavender: "bg-lavender text-lavender-foreground",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
