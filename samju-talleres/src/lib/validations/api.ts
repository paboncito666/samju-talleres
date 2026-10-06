import { z } from "zod";

const currentYear = new Date().getFullYear();

export const vehicleCreateSchema = z
  .object({
    placa: z
      .string()
      .trim()
      .min(1, "La placa es obligatoria.")
      .max(20, "La placa no puede superar 20 caracteres.")
      .transform((value) => value.toUpperCase()),
    marca: z.string().trim().min(1).max(100),
    modelo: z.string().trim().min(1).max(100),
    anio: z.number().int().min(1900).max(currentYear + 1),
    color: z.string().trim().min(1).max(60),
    kilometraje: z.number().int().nonnegative(),
    datos_propietario: z
      .record(z.string(), z.unknown())
      .optional()
      .default({}),
  })
  .strict();

export const workOrderCreateSchema = z
  .object({
    vehiculo_id: z.string().uuid(),
    mecanico_id: z.string().uuid().nullable().optional(),
    descripcion_trabajo: z.string().trim().min(1).max(10_000),
    tipo_servicio: z.string().trim().min(1).max(120),
  })
  .strict();

export const workOrderStatuses = [
  "Recibido",
  "En Diagnóstico",
  "Pendiente Aprobación",
  "En Reparación",
  "Control de Calidad",
  "Listo para Entrega",
  "Entregado",
  "Cancelado",
] as const;

export type WorkOrderStatus = (typeof workOrderStatuses)[number];

export const workOrderStatusSchema = z
  .object({
    estado: z.enum(workOrderStatuses),
  })
  .strict();

export const workOrderStatusTransitions: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  Recibido: ["En Diagnóstico"],
  "En Diagnóstico": ["Pendiente Aprobación"],
  "Pendiente Aprobación": ["En Reparación", "Cancelado"],
  "En Reparación": ["Control de Calidad"],
  "Control de Calidad": ["Listo para Entrega", "Cancelado"],
  "Listo para Entrega": ["Entregado"],
  Entregado: [],
  Cancelado: [],
};
