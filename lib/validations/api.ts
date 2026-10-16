import { z } from "zod";

const currentYear = new Date().getFullYear();
const workTypes = [
  "mecanico",
  "electrico",
  "latoneria",
  "pintura",
  "preventivo",
  "otro",
] as const;

export const vehicleCreateSchema = z
  .object({
    placa: z.string().trim().min(1).max(10, "La placa no puede superar los 10 caracteres.").transform((value) => value.toUpperCase()),
    marca: z.string().trim().min(1).max(100),
    modelo: z.string().trim().min(1).max(100),
    anio: z.number().int().min(1900).max(currentYear + 1),
    color: z.string().trim().max(60).optional().default(""),
    kilometraje: z.number().int().nonnegative().optional().default(0),
    propietario_nombre: z.string().trim().max(160).optional().default(""),
    propietario_telefono: z.string().trim().max(40).optional().default(""),
  })
  .strict();

export const workOrderCreateSchema = z
  .object({
    vehiculo_id: z.string().uuid(),
    mecanico_id: z.string().uuid().nullable().optional(),
    descripcion_trabajo: z.string().trim().min(1).max(10_000),
    tipo_servicio: z.enum(workTypes),
    fecha_estimada_entrega: z.string().date().nullable().optional(),
  })
  .strict();

export const workOrderStatuses = [
  "RECIBIDO",
  "DIAGNOSTICO",
  "PENDIENTE",
  "REPARACION",
  "CALIDAD",
  "LISTO",
  "ENTREGADO",
  "CANCELADO",
] as const;

export type WorkOrderStatus = (typeof workOrderStatuses)[number];

export const workOrderStatusSchema = z
  .object({
    estado: z.enum(workOrderStatuses),
    motivo: z.string().trim().max(500).optional(),
    diagnostico: z.string().trim().max(10_000).optional(),
  })
  .strict();

export const workOrderStatusTransitions: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  RECIBIDO: ["DIAGNOSTICO"],
  DIAGNOSTICO: ["PENDIENTE"],
  PENDIENTE: ["REPARACION", "CANCELADO"],
  REPARACION: ["CALIDAD"],
  CALIDAD: ["LISTO", "CANCELADO"],
  LISTO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};
