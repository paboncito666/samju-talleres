"use client";

import type { EstadoRealtime } from "@/hooks/useRealtimeRefresh";
import { cn } from "@/lib/utils";

export interface EstadoConexionProps {
  estado: EstadoRealtime;
}

export function EstadoConexion({ estado }: EstadoConexionProps) {
  if (estado === "deshabilitado") return null;

  const conectado = estado === "conectado";

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        conectado
          ? "bg-estado-calidad text-estado-calidad-text"
          : "bg-surface-muted text-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          conectado ? "bg-estado-calidad-text" : "animate-pulse bg-gris-400",
        )}
      />
      {conectado ? "En vivo" : "Reconectando…"}
    </span>
  );
}
