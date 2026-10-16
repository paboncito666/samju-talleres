import type { WorkOrderStatus } from "@/lib/validations/api";

export const ESTADOS: Record<
  WorkOrderStatus,
  { label: string; color: string }
> = {
  RECIBIDO: { label: "Recibido", color: "bg-estado-recibido text-estado-recibido-text" },
  DIAGNOSTICO: { label: "En diagnóstico", color: "bg-estado-diagnostico text-estado-diagnostico-text" },
  PENDIENTE: { label: "Pendiente de aprobación", color: "bg-estado-pendiente text-estado-pendiente-text" },
  REPARACION: { label: "En reparación", color: "bg-estado-reparacion text-estado-reparacion-text" },
  CALIDAD: { label: "Control de calidad", color: "bg-estado-calidad text-estado-calidad-text" },
  LISTO: { label: "Listo para entrega", color: "bg-estado-listo text-estado-listo-text" },
  ENTREGADO: { label: "Entregado", color: "bg-estado-entregado text-estado-entregado-text" },
  CANCELADO: { label: "Cancelado", color: "bg-estado-cancelado text-estado-cancelado-text" },
};

export const ACTIVE_STATUSES = [
  "RECIBIDO",
  "DIAGNOSTICO",
  "PENDIENTE",
  "REPARACION",
  "CALIDAD",
  "LISTO",
] as const satisfies readonly WorkOrderStatus[];
