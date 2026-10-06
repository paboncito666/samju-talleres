import type { EstadoOrden } from "@/lib/estados";

export type { EstadoOrden } from "@/lib/estados";
export type RolUsuario = "admin" | "mecanico" | "recepcionista";
export type EtapaFoto = "entrada" | "proceso" | "salida";
export type TipoTrabajo =
  | "mecanico"
  | "electrico"
  | "latoneria"
  | "pintura"
  | "preventivo"
  | "otro";

export interface Perfil {
  id: string;
  creado_en: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  avatar_url: string | null;
  actualizado_en: string;
}

export interface Vehiculo {
  id: string;
  creado_en: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  kilometraje: number;
  propietario_nombre: string;
  propietario_telefono: string | null;
  actualizado_en: string;
}

export interface OrdenTrabajo {
  id: string;
  creado_en: string;
  vehiculo_id: string;
  mecanico_id: string | null;
  recepcionista_id: string | null;
  estado: EstadoOrden;
  descripcion_trabajo: string;
  tipo_servicio: TipoTrabajo;
  fecha_ingreso: string;
  fecha_estimada_entrega: string | null;
  fecha_entrega_real: string | null;
  observaciones: string | null;
  motivo_cancelacion: string | null;
  actualizado_en: string;
}

export interface TrabajoRealizado {
  id: string;
  creado_en: string;
  orden_id: string;
  descripcion: string;
  tipo: TipoTrabajo;
  completado: boolean;
}

export interface FotoVehiculo {
  id: string;
  creado_en: string;
  orden_id: string;
  url: string;
  etapa: EtapaFoto;
  subida_por: string;
}

export interface HistorialEstado {
  id: string;
  creado_en: string;
  orden_id: string;
  estado_anterior: EstadoOrden | null;
  estado_nuevo: EstadoOrden;
  cambiado_por: string;
  motivo: string | null;
}

export interface NotaInterna {
  id: string;
  creado_en: string;
  orden_id: string;
  autor_id: string;
  contenido: string;
}

export interface RepuestoOrden {
  id: string;
  creado_en: string;
  orden_id: string;
  nombre_repuesto: string;
  cantidad: number;
  costo_unitario: number;
}

export interface OrdenActiva {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  mecanico: string | null;
  estado: EstadoOrden;
  descripcion_trabajo: string;
  fecha_ingreso: string;
  fecha_estimada_entrega: string | null;
  dias_en_taller: number;
}

export interface CargaMecanico {
  mecanico: string;
  en_reparacion: number;
  total_activos: number;
  promedio_dias: number;
}

export interface OrdenesPorEstado {
  estado: EstadoOrden;
  cantidad: number;
}

export interface ResumenDashboard {
  ordenesActivas: number;
  listasParaEntrega: number;
  promedioDiasReparacion: number;
  ordenesEnReparacion: number;
}

export interface FiltrosOrdenes {
  estado?: EstadoOrden;
  mecanicoId?: string;
  desde?: string;
  hasta?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ResultadoListadoOrdenes {
  data: OrdenConRelaciones[];
  total: number;
  error: Error | null;
}

export type ResultadoDatos<T> =
  | { data: T; error: null }
  | { data: null; error: Error };

export type OrdenConRelaciones = OrdenTrabajo & {
  vehiculo: Vehiculo;
  mecanico: Pick<Perfil, "id" | "nombre"> | null;
};
