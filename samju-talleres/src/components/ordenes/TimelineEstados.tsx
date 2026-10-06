import { Check } from "lucide-react";
import {
  ESTADOS,
  FLUJO_PRINCIPAL,
  type EstadoOrden,
} from "@/lib/estados";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export interface TimelineEstadosProps {
  estado: EstadoOrden;
  motivoCancelacion?: string | null;
  estadoPrevioCancelacion?: EstadoOrden | null;
}

export function TimelineEstados({
  estado,
  motivoCancelacion,
  estadoPrevioCancelacion,
}: TimelineEstadosProps) {
  const estadoActual =
    estado === "CANCELADO"
      ? (estadoPrevioCancelacion ?? "PENDIENTE")
      : estado;
  const indiceActual = FLUJO_PRINCIPAL.indexOf(estadoActual);
  const pasosVisibles =
    estado === "CANCELADO"
      ? FLUJO_PRINCIPAL.slice(0, indiceActual + 1)
      : FLUJO_PRINCIPAL;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avance de la orden</CardTitle>
      </CardHeader>
      <CardContent>
        <ol
          aria-label="Línea de tiempo de estados"
          className="flex flex-col gap-0 md:flex-row md:items-start md:gap-0"
        >
          {pasosVisibles.map((paso, indice) => {
            const completado =
              estado === "CANCELADO" ? true : indice < indiceActual;
            const actual = estado !== "CANCELADO" && indice === indiceActual;
            return (
              <li
                key={paso}
                className={cn(
                  "relative flex min-h-12 flex-1 items-start gap-3 pb-4 last:pb-0 md:min-h-0 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center",
                    (indice < pasosVisibles.length - 1 ||
                      (estado === "CANCELADO" &&
                        indice === pasosVisibles.length - 1)) &&
                    "after:absolute after:bottom-0 after:left-[0.9375rem] after:top-8 after:w-px after:bg-line md:after:left-1/2 md:after:top-4 md:after:h-px md:after:w-full",
                    (indice < indiceActual || estado === "CANCELADO") &&
                      "after:bg-gris-400",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    completado &&
                      "border-ink bg-ink text-white",
                    actual &&
                      "border-transparent font-semibold text-foreground ring-2 ring-offset-2 ring-offset-surface",
                    !completado && !actual &&
                      "border-line bg-surface-muted text-muted",
                    actual && {
                      "ring-[#DCE6F2]": paso === "RECIBIDO",
                      "ring-[#E6E0F3]": paso === "DIAGNOSTICO",
                      "ring-[#F6EBC8]": paso === "PENDIENTE",
                      "ring-[#F8DCCB]": paso === "REPARACION",
                      "ring-[#D3EBE3]": paso === "CALIDAD",
                      "ring-[#DDEBCF]": paso === "LISTO",
                      "ring-[#E4E4E7]": paso === "ENTREGADO",
                    },
                  )}
                  style={actual ? { backgroundColor: ESTADOS[paso].color } : undefined}
                  aria-current={actual ? "step" : undefined}
                >
                  {completado ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    indice + 1
                  )}
                </span>
                <span
                  className={cn(
                    "pt-1 text-sm md:max-w-24 md:pt-0 md:text-xs",
                    actual ? "font-semibold text-foreground" : "text-muted",
                  )}
                >
                  {ESTADOS[paso].label}
                </span>
              </li>
            );
          })}
          {estado === "CANCELADO" && (
            <li className="relative flex items-start gap-3 pt-1 md:flex-1 md:flex-col md:items-center md:gap-2 md:pt-0 md:text-center">
              <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-estado-cancelado text-estado-cancelado-text ring-2 ring-estado-cancelado/40 ring-offset-2 ring-offset-surface">
                ×
              </span>
              <span className="pt-1 text-sm font-semibold text-estado-cancelado-text md:pt-0 md:text-xs">
                Cancelado
              </span>
            </li>
          )}
        </ol>
        {estado === "CANCELADO" && motivoCancelacion && (
          <p className="mt-5 rounded-lg bg-estado-cancelado/50 px-3 py-2 text-sm text-estado-cancelado-text">
            <span className="font-semibold">Motivo de cancelación:</span>{" "}
            {motivoCancelacion}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
