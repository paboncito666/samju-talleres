import type { HTMLAttributes } from "react";
import { ESTADOS, type EstadoOrden } from "@/lib/estados";
import { cn } from "@/lib/utils";

type EstadoBadgeProps = {
  estado: EstadoOrden;
  variant?: never;
};

type NeutralBadgeProps = {
  estado?: never;
  variant?: "neutral";
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  (EstadoBadgeProps | NeutralBadgeProps);

export function Badge({
  className,
  estado,
  variant,
  children,
  ...props
}: BadgeProps) {
  const contenido = estado ? ESTADOS[estado].label : children;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        estado ? ESTADOS[estado].clasesBadge : variant === "neutral" || !variant
          ? "bg-surface-muted text-foreground"
          : undefined,
        className,
      )}
      {...props}
    >
      {contenido}
    </span>
  );
}
