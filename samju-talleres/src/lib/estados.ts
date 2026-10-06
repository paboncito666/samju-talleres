export type EstadoOrden =
  | "RECIBIDO"
  | "DIAGNOSTICO"
  | "PENDIENTE"
  | "REPARACION"
  | "CALIDAD"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADO";

export const ESTADOS: Record<
  EstadoOrden,
  { label: string; orden: number; clasesBadge: string; color: string }
> = {
  RECIBIDO: {
    label: "Recibido",
    orden: 1,
    clasesBadge: "bg-estado-recibido text-estado-recibido-text",
    color: "#3B516B",
  },
  DIAGNOSTICO: {
    label: "En Diagnóstico",
    orden: 2,
    clasesBadge: "bg-estado-diagnostico text-estado-diagnostico-text",
    color: "#4C4170",
  },
  PENDIENTE: {
    label: "Pendiente Aprobación",
    orden: 3,
    clasesBadge: "bg-estado-pendiente text-estado-pendiente-text",
    color: "#7A6120",
  },
  REPARACION: {
    label: "En Reparación",
    orden: 4,
    clasesBadge: "bg-estado-reparacion text-estado-reparacion-text",
    color: "#8A4B2A",
  },
  CALIDAD: {
    label: "Control de Calidad",
    orden: 5,
    clasesBadge: "bg-estado-calidad text-estado-calidad-text",
    color: "#2F6B5A",
  },
  LISTO: {
    label: "Listo para Entrega",
    orden: 6,
    clasesBadge: "bg-estado-listo text-estado-listo-text",
    color: "#4A6B2E",
  },
  ENTREGADO: {
    label: "Entregado",
    orden: 7,
    clasesBadge: "bg-estado-entregado text-estado-entregado-text",
    color: "#3F3F46",
  },
  CANCELADO: {
    label: "Cancelado",
    orden: 8,
    clasesBadge: "bg-estado-cancelado text-estado-cancelado-text",
    color: "#8A3B44",
  },
};

export const FLUJO_PRINCIPAL: EstadoOrden[] = [
  "RECIBIDO",
  "DIAGNOSTICO",
  "PENDIENTE",
  "REPARACION",
  "CALIDAD",
  "LISTO",
  "ENTREGADO",
];

export const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  RECIBIDO: ["DIAGNOSTICO"],
  DIAGNOSTICO: ["PENDIENTE"],
  PENDIENTE: ["REPARACION", "CANCELADO"],
  REPARACION: ["CALIDAD"],
  CALIDAD: ["LISTO", "CANCELADO"],
  LISTO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

export function esEstadoFinal(estado: EstadoOrden): boolean {
  return TRANSICIONES[estado].length === 0;
}

export function siguienteEstado(estado: EstadoOrden): EstadoOrden | null {
  const indice = FLUJO_PRINCIPAL.indexOf(estado);
  if (indice === -1) {
    return null;
  }

  return FLUJO_PRINCIPAL[indice + 1] ?? null;
}
