import {
  ESTADOS,
  esEstadoFinal,
  type EstadoOrden,
} from "@/lib/estados";
import { USE_MOCKS } from "@/lib/data/config";
import {
  MECANICOS_MOCK,
  ORDENES_MOCK,
  VEHICULOS_MOCK,
} from "@/lib/mocks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CargaMecanico,
  FiltrosOrdenes,
  OrdenConRelaciones,
  OrdenesPorEstado,
  OrdenTrabajo,
  Perfil,
  ResultadoDatos,
  ResultadoListadoOrdenes,
  ResumenDashboard,
  Vehiculo,
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

function errorDe(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Ocurrió un error al consultar los datos del taller.");
}

function normalizarPagina(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

function ordenarPorIngreso(a: OrdenTrabajo, b: OrdenTrabajo): number {
  return b.fecha_ingreso.localeCompare(a.fecha_ingreso);
}

function ordenarMecanicos(ordenes: OrdenConRelaciones[]): OrdenConRelaciones[] {
  return [...ordenes].sort(ordenarPorIngreso);
}

function filtrarOrdenesMock(filtros: FiltrosOrdenes): OrdenConRelaciones[] {
  const query = filtros.q?.trim().toLocaleLowerCase("es-CO");
  const vehiculosPorId = new Map(VEHICULOS_MOCK.map((vehiculo) => [vehiculo.id, vehiculo]));
  const mecanicosPorId = new Map(MECANICOS_MOCK.map((mecanico) => [mecanico.id, mecanico]));

  const resultado = ORDENES_MOCK.flatMap((orden) => {
    const vehiculo = vehiculosPorId.get(orden.vehiculo_id);
    if (!vehiculo) {
      return [];
    }

    const mecanicoPerfil = orden.mecanico_id
      ? mecanicosPorId.get(orden.mecanico_id)
      : undefined;
    const perteneceAConsulta =
      !query ||
      vehiculo.placa.toLocaleLowerCase("es-CO").includes(query) ||
      vehiculo.propietario_nombre.toLocaleLowerCase("es-CO").includes(query);
    const cumpleFechas =
      (!filtros.desde || orden.fecha_ingreso.slice(0, 10) >= filtros.desde) &&
      (!filtros.hasta || orden.fecha_ingreso.slice(0, 10) <= filtros.hasta);

    if (
      !perteneceAConsulta ||
      (filtros.estado && orden.estado !== filtros.estado) ||
      (filtros.mecanicoId && orden.mecanico_id !== filtros.mecanicoId) ||
      !cumpleFechas
    ) {
      return [];
    }

    return [
      {
        ...orden,
        vehiculo,
        mecanico: mecanicoPerfil
          ? { id: mecanicoPerfil.id, nombre: mecanicoPerfil.nombre }
          : null,
      },
    ];
  });

  return ordenarMecanicos(resultado);
}

function validarFiltros(filtros: FiltrosOrdenes): Error | null {
  if (
    filtros.estado &&
    !estados.includes(filtros.estado)
  ) {
    return new Error("El estado seleccionado no es válido.");
  }
  if (
    (filtros.desde && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.desde)) ||
    (filtros.hasta && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.hasta))
  ) {
    return new Error("El rango de fechas no es válido.");
  }
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    return new Error("La fecha inicial debe ser anterior a la fecha final.");
  }
  return null;
}

export async function getOrdenes(
  filtros: FiltrosOrdenes = {},
): Promise<ResultadoListadoOrdenes> {
  const filtroInvalido = validarFiltros(filtros);
  if (filtroInvalido) {
    return { data: [], total: 0, error: filtroInvalido };
  }

  const page = normalizarPagina(filtros.page, 1);
  const pageSize = Math.min(normalizarPagina(filtros.pageSize, 10), 100);

  if (USE_MOCKS) {
    const filtradas = filtrarOrdenesMock(filtros);
    const inicio = (page - 1) * pageSize;
    return {
      data: filtradas.slice(inicio, inicio + pageSize),
      total: filtradas.length,
      error: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const query = filtros.q?.trim();
    let idsVehiculo: string[] | null = null;

    if (query) {
      const terminoSeguro = query.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
      if (!terminoSeguro) {
        return { data: [], total: 0, error: null };
      }
      const { data: vehiculos, error: errorVehiculos } = await supabase
        .from("vehiculos")
        .select("id")
        .or(
          `placa.ilike.%${terminoSeguro}%,propietario_nombre.ilike.%${terminoSeguro}%`,
        )
        .returns<Pick<Vehiculo, "id">[]>();

      if (errorVehiculos) {
        return { data: [], total: 0, error: errorDe(errorVehiculos) };
      }
      idsVehiculo = vehiculos.map((vehiculo) => vehiculo.id);
      if (idsVehiculo.length === 0) {
        return { data: [], total: 0, error: null };
      }
    }

    let consulta = supabase
      .from("ordenes_trabajo")
      .select("*", { count: "exact" });
    if (filtros.estado) {
      consulta = consulta.eq("estado", filtros.estado);
    }
    if (filtros.mecanicoId) {
      consulta = consulta.eq("mecanico_id", filtros.mecanicoId);
    }
    if (filtros.desde) {
      consulta = consulta.gte("fecha_ingreso", `${filtros.desde}T00:00:00Z`);
    }
    if (filtros.hasta) {
      consulta = consulta.lt(
        "fecha_ingreso",
        `${addOneDay(filtros.hasta)}T00:00:00Z`,
      );
    }
    if (idsVehiculo) {
      consulta = consulta.in("vehiculo_id", idsVehiculo);
    }

    const { data: ordenes, error: errorOrdenes, count } = await consulta
      .order("fecha_ingreso", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
      .returns<OrdenTrabajo[]>();

    if (errorOrdenes) {
      return { data: [], total: 0, error: errorDe(errorOrdenes) };
    }
    if (ordenes.length === 0) {
      return { data: [], total: count ?? 0, error: null };
    }

    const vehiculoIds = [...new Set(ordenes.map((orden) => orden.vehiculo_id))];
    const mecanicoIds = [
      ...new Set(
        ordenes.flatMap((orden) => (orden.mecanico_id ? [orden.mecanico_id] : [])),
      ),
    ];
    const [
      { data: vehiculos, error: errorVehiculos },
      mecanicosResultado,
    ] = await Promise.all([
      supabase
        .from("vehiculos")
        .select("*")
        .in("id", vehiculoIds)
        .returns<Vehiculo[]>(),
      mecanicoIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, nombre")
            .in("id", mecanicoIds)
            .returns<Pick<Perfil, "id" | "nombre">[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (errorVehiculos) {
      return { data: [], total: 0, error: errorDe(errorVehiculos) };
    }
    if (mecanicosResultado.error) {
      return { data: [], total: 0, error: errorDe(mecanicosResultado.error) };
    }

    const vehiculosPorId = new Map(
      vehiculos.map((vehiculo) => [vehiculo.id, vehiculo]),
    );
    const mecanicosPorId = new Map(
      mecanicosResultado.data.map((mecanico) => [mecanico.id, mecanico]),
    );
    const datos: OrdenConRelaciones[] = [];

    for (const orden of ordenes) {
      const vehiculo = vehiculosPorId.get(orden.vehiculo_id);
      if (!vehiculo) {
        return {
          data: [],
          total: 0,
          error: new Error(`No se encontró el vehículo de la orden ${orden.id}.`),
        };
      }
      const mecanico = orden.mecanico_id
        ? (mecanicosPorId.get(orden.mecanico_id) ?? null)
        : null;
      datos.push({ ...orden, vehiculo, mecanico });
    }

    return { data: datos, total: count ?? 0, error: null };
  } catch (error) {
    return { data: [], total: 0, error: errorDe(error) };
  }
}

function addOneDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export async function getMecanicos(): Promise<
  ResultadoDatos<Pick<Perfil, "id" | "nombre">[]>
> {
  if (USE_MOCKS) {
    return {
      data: MECANICOS_MOCK.filter((mecanico) => mecanico.activo).map(
        ({ id, nombre }) => ({ id, nombre }),
      ),
      error: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre")
      .eq("rol", "mecanico")
      .eq("activo", true)
      .order("nombre")
      .returns<Pick<Perfil, "id" | "nombre">[]>();

    if (error) {
      return fallido(error);
    }
    return { data, error: null };
  } catch (error) {
    return fallido(error);
  }
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
