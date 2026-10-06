import {
  ESTADOS,
  esEstadoFinal,
  type EstadoOrden,
} from "@/lib/estados";
import { USE_MOCKS } from "@/lib/data/config";
import {
  MECANICOS_MOCK,
  ORDENES_MOCK,
} from "@/lib/mocks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CargaMecanico,
  OrdenesPorEstado,
  OrdenTrabajo,
  Perfil,
  ResultadoDatos,
  ResumenDashboard,
} from "@/types";

const estados = Object.keys(ESTADOS) as EstadoOrden[];

function exitoso<T>(data: T): ResultadoDatos<T> {
  return { data, error: null };
}

function fallido<T>(error: unknown): ResultadoDatos<T> {
  return {
    data: null,
    error:
      error instanceof Error
        ? error
        : new Error("Ocurrió un error al consultar los datos del taller."),
  };
}

function contarEstados(ordenes: Pick<OrdenTrabajo, "estado">[]): OrdenesPorEstado[] {
  const conteos = new Map<EstadoOrden, number>(
    estados.map((estado) => [estado, 0]),
  );

  for (const orden of ordenes) {
    if (!esEstadoFinal(orden.estado)) {
      conteos.set(orden.estado, (conteos.get(orden.estado) ?? 0) + 1);
    }
  }

  return estados
    .filter((estado) => !esEstadoFinal(estado))
    .map((estado) => ({ estado, cantidad: conteos.get(estado) ?? 0 }));
}

function diasEntre(inicio: string, fin: string): number {
  const diferencia =
    new Date(fin).getTime() - new Date(inicio).getTime();
  if (!Number.isFinite(diferencia) || diferencia < 0) {
    return 0;
  }
  return diferencia / 86_400_000;
}

function resumenDesdeOrdenes(
  ordenes: Pick<
    OrdenTrabajo,
    "estado" | "fecha_ingreso" | "fecha_entrega_real"
  >[],
): ResumenDashboard {
  const activas = ordenes.filter((orden) => !esEstadoFinal(orden.estado));
  const entregadas = ordenes.filter(
    (orden) => orden.estado === "ENTREGADO" && orden.fecha_entrega_real,
  );
  const promedio =
    entregadas.length === 0
      ? 0
      : entregadas.reduce(
          (total, orden) =>
            total +
            (orden.fecha_entrega_real
              ? diasEntre(orden.fecha_ingreso, orden.fecha_entrega_real)
              : 0),
          0,
        ) / entregadas.length;

  return {
    ordenesActivas: activas.length,
    listasParaEntrega: activas.filter((orden) => orden.estado === "LISTO").length,
    ordenesEnReparacion: activas.filter(
      (orden) => orden.estado === "REPARACION",
    ).length,
    promedioDiasReparacion: Number(promedio.toFixed(1)),
  };
}

function cargaMecanicosMock(): CargaMecanico[] {
  return MECANICOS_MOCK.map((mecanico: Perfil) => {
    const ordenesAsignadas = ORDENES_MOCK.filter(
      (orden) =>
        orden.mecanico_id === mecanico.id && !esEstadoFinal(orden.estado),
    );
    const enReparacion = ordenesAsignadas.filter(
      (orden) => orden.estado === "REPARACION",
    ).length;

    return {
      mecanico: mecanico.nombre,
      en_reparacion: enReparacion,
      total_activos: ordenesAsignadas.length,
      promedio_dias:
        ordenesAsignadas.length === 0
          ? 0
          : Number(
              (
                ordenesAsignadas.reduce(
                  (total, orden) =>
                    total + diasEntre(orden.fecha_ingreso, "2026-10-06T09:00:00.000Z"),
                  0,
                ) / ordenesAsignadas.length
              ).toFixed(1),
            ),
    };
  });
}

export async function getOrdenesPorEstado(): Promise<
  ResultadoDatos<OrdenesPorEstado[]>
> {
  if (USE_MOCKS) {
    return exitoso(contarEstados(ORDENES_MOCK));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ordenes_trabajo")
      .select("estado")
      .returns<Pick<OrdenTrabajo, "estado">[]>();

    if (error) {
      return fallido(error);
    }
    return exitoso(contarEstados(data));
  } catch (error) {
    return fallido(error);
  }
}

export async function getCargaMecanicos(): Promise<
  ResultadoDatos<CargaMecanico[]>
> {
  if (USE_MOCKS) {
    return exitoso(cargaMecanicosMock());
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("v_carga_mecanicos")
      .select("*")
      .returns<CargaMecanico[]>();

    if (error) {
      return fallido(error);
    }
    return exitoso(data);
  } catch (error) {
    return fallido(error);
  }
}

export async function getResumenDashboard(): Promise<
  ResultadoDatos<ResumenDashboard>
> {
  if (USE_MOCKS) {
    return exitoso(resumenDesdeOrdenes(ORDENES_MOCK));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ordenes_trabajo")
      .select("estado, fecha_ingreso, fecha_entrega_real")
      .returns<
        Pick<
          OrdenTrabajo,
          "estado" | "fecha_ingreso" | "fecha_entrega_real"
        >[]
      >();

    if (error) {
      return fallido(error);
    }
    return exitoso(resumenDesdeOrdenes(data));
  } catch (error) {
    return fallido(error);
  }
}
