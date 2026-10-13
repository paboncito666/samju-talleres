import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
} as const;

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof sizes;
  label?: string;
}

export function Spinner({
  className,
  size = "md",
  label = "Cargando",
  ...props
}: SpinnerProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none",
        sizes[size],
        className,
      )}
      role={props["aria-hidden"] ? undefined : "status"}
      aria-label={props["aria-hidden"] ? undefined : label}
    />
  );
}
