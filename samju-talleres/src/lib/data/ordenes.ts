import {
  ESTADOS,
  TRANSICIONES,
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
  HistorialEstado,
  OrdenConRelaciones,
  OrdenDetalle,
  OrdenesPorEstado,
  RepuestoOrden,
  OrdenTrabajo,
  Perfil,
  ResultadoDatos,
  ResultadoListadoOrdenes,
  ResumenDashboard,
  TrabajoRealizado,
  Vehiculo,
} from "@/types";

const estados = Object.keys(ESTADOS) as EstadoOrden[];

const TRABAJOS_MOCK: TrabajoRealizado[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[6].id,
    descripcion: "Desmontaje de transmisión",
    tipo: "mecanico",
    completado: true,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[6].id,
    descripcion: "Instalación de embrague nuevo",
    tipo: "mecanico",
    completado: false,
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[12].id,
    descripcion: "Cambio de pastillas de freno",
    tipo: "mecanico",
    completado: true,
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[12].id,
    descripcion: "Prueba de ruta y verificación",
    tipo: "mecanico",
    completado: true,
  },
];

const REPUESTOS_MOCK: RepuestoOrden[] = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[6].id,
    nombre_repuesto: "Kit de embrague",
    cantidad: 1,
    costo_unitario: 680000,
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[12].id,
    nombre_repuesto: "Pastillas de freno delanteras",
    cantidad: 1,
    costo_unitario: 185000,
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    creado_en: "2026-10-06T09:00:00.000Z",
    orden_id: ORDENES_MOCK[12].id,
    nombre_repuesto: "Líquido de frenos",
    cantidad: 2,
    costo_unitario: 28000,
  },
];

const ESTADO_PREVIO_CANCELACION_MOCK = new Map<string, EstadoOrden>();

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

export async function getOrdenById(id: string): Promise<OrdenDetalle | null> {
  if (USE_MOCKS) {
    const orden = ORDENES_MOCK.find((item) => item.id === id);
    if (!orden) {
      return null;
    }
    const vehiculo = VEHICULOS_MOCK.find(
      (item) => item.id === orden.vehiculo_id,
    );
    if (!vehiculo) {
      throw new Error(`No se encontró el vehículo de la orden ${id}.`);
    }
    const mecanicoPerfil = orden.mecanico_id
      ? MECANICOS_MOCK.find((item) => item.id === orden.mecanico_id)
      : undefined;
    return {
      ...orden,
      vehiculo,
      mecanico: mecanicoPerfil
        ? { id: mecanicoPerfil.id, nombre: mecanicoPerfil.nombre }
        : null,
      recepcionista: null,
      trabajos_realizados: TRABAJOS_MOCK.filter(
        (trabajo) => trabajo.orden_id === id,
      ),
      repuestos_orden: REPUESTOS_MOCK.filter(
        (repuesto) => repuesto.orden_id === id,
      ),
      estadoPrevioCancelacion:
        orden.estado === "CANCELADO"
          ? (ESTADO_PREVIO_CANCELACION_MOCK.get(id) ?? "PENDIENTE")
          : null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: orden, error: errorOrden } = await supabase
    .from("ordenes_trabajo")
    .select("*")
    .eq("id", id)
    .maybeSingle<OrdenTrabajo>();

  if (errorOrden) {
    throw errorDe(errorOrden);
  }
  if (!orden) {
    return null;
  }

  const [
    { data: vehiculo, error: errorVehiculo },
    { data: perfiles, error: errorPerfiles },
    { data: trabajos, error: errorTrabajos },
    { data: repuestos, error: errorRepuestos },
    { data: historial, error: errorHistorial },
  ] = await Promise.all([
    supabase
      .from("vehiculos")
      .select("*")
      .eq("id", orden.vehiculo_id)
      .maybeSingle<Vehiculo>(),
    supabase
      .from("profiles")
      .select("id, nombre")
      .in(
        "id",
        [
          orden.mecanico_id,
          orden.recepcionista_id,
        ].filter((profileId): profileId is string => profileId !== null),
      )
      .returns<Pick<Perfil, "id" | "nombre">[]>(),
    supabase
      .from("trabajos_realizados")
      .select("*")
      .eq("orden_id", id)
      .order("creado_en")
      .returns<TrabajoRealizado[]>(),
    supabase
      .from("repuestos_orden")
      .select("*")
      .eq("orden_id", id)
      .order("creado_en")
      .returns<RepuestoOrden[]>(),
    supabase
      .from("historial_estados")
      .select("estado_anterior, creado_en")
      .eq("orden_id", id)
      .eq("estado_nuevo", "CANCELADO")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<HistorialEstado, "estado_anterior" | "creado_en">>(),
  ]);

  if (errorVehiculo) throw errorDe(errorVehiculo);
  if (errorPerfiles) throw errorDe(errorPerfiles);
  if (errorTrabajos) throw errorDe(errorTrabajos);
  if (errorRepuestos) throw errorDe(errorRepuestos);
  if (errorHistorial) throw errorDe(errorHistorial);
  if (!vehiculo) {
    throw new Error(`No se encontró el vehículo de la orden ${id}.`);
  }

  const perfilesPorId = new Map(perfiles.map((perfil) => [perfil.id, perfil]));
  return {
    ...orden,
    vehiculo,
    mecanico: orden.mecanico_id
      ? (perfilesPorId.get(orden.mecanico_id) ?? null)
      : null,
    recepcionista: orden.recepcionista_id
      ? (perfilesPorId.get(orden.recepcionista_id) ?? null)
      : null,
    trabajos_realizados: trabajos,
    repuestos_orden: repuestos,
    estadoPrevioCancelacion: historial?.estado_anterior ?? null,
  };
}

export async function cambiarEstado(
  ordenId: string,
  nuevoEstado: EstadoOrden,
  motivo?: string,
): Promise<ResultadoDatos<OrdenTrabajo>> {
  if (!estados.includes(nuevoEstado)) {
    return fallido(new Error("El nuevo estado no es válido."));
  }

  if (nuevoEstado === "CANCELADO" && !motivo?.trim()) {
    return fallido(
      new Error("Debes indicar el motivo para cancelar la orden."),
    );
  }

  if (USE_MOCKS) {
    const orden = ORDENES_MOCK.find((item) => item.id === ordenId);
    if (!orden) {
      return fallido(new Error("No se encontró la orden de trabajo."));
    }
    if (!TRANSICIONES[orden.estado].includes(nuevoEstado)) {
      return fallido(
        new Error(
          `No se puede cambiar de ${ESTADOS[orden.estado].label} a ${ESTADOS[nuevoEstado].label}.`,
        ),
      );
    }

    const estadoAnterior = orden.estado;
    if (nuevoEstado === "CANCELADO") {
      ESTADO_PREVIO_CANCELACION_MOCK.set(ordenId, estadoAnterior);
    }
    orden.estado = nuevoEstado;
    orden.motivo_cancelacion =
      nuevoEstado === "CANCELADO" ? (motivo?.trim() ?? null) : null;
    orden.actualizado_en = new Date().toISOString();
    if (nuevoEstado === "ENTREGADO") {
      orden.fecha_entrega_real = new Date().toISOString();
    }
    return exitoso({ ...orden });
  }

  return cambiarEstadoReal(ordenId, nuevoEstado, motivo);
}

async function cambiarEstadoReal(
  ordenId: string,
  nuevoEstado: EstadoOrden,
  motivo?: string,
): Promise<ResultadoDatos<OrdenTrabajo>> {
  // TODO Samuel: confirmar e integrar la API Route POST /api/ordenes/[id]/estado
  // y su body { estado: nuevoEstado, motivo } antes de conectar esta operación.
  void ordenId;
  void nuevoEstado;
  void motivo;
  return fallido(
    new Error(
      "El cambio de estado real está pendiente de integrar con la API Route de órdenes de Samuel.",
    ),
  );
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
