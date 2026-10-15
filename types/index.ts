import type { WorkOrderStatus } from "@/lib/validations/api";

export type { WorkOrderStatus };

export type ProfileRole = "admin" | "mecanico" | "recepcionista";

export interface Vehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  kilometraje: number;
  propietario_nombre: string | null;
  propietario_telefono: string | null;
}

export interface OrderSummary {
  id: string;
  vehiculo_id: string;
  mecanico_id: string | null;
  estado: WorkOrderStatus;
  descripcion_trabajo: string;
  tipo_servicio: string;
  fecha_ingreso: string;
  fecha_estimada_entrega: string | null;
  vehiculos?: Pick<Vehicle, "placa" | "marca" | "modelo" | "propietario_nombre">;
}

export type EtapaFoto = "entrada" | "proceso" | "salida";

export interface FotoVehiculo {
  id: string;
  orden_id: string;
  url: string;
  etapa: EtapaFoto;
  subida_por: string | null;
  creado_en: string;
}
