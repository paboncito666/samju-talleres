import Link from "next/link";
import { ESTADOS } from "@/lib/estados";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const serviceTypes = ["mecanico", "electrico", "latoneria", "pintura", "preventivo", "otro"] as const;
const dateFilter = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().date().optional(),
);
const filtersSchema = z.object({
  q: z.string().trim().max(12).optional().default(""),
  desde: dateFilter,
  hasta: dateFilter,
  tipo: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.enum(serviceTypes).optional(),
  ),
  mecanicoId: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().uuid().optional(),
  ),
  page: z.preprocess(
    (value) => value === undefined ? undefined : value,
    z.string().regex(/^\d+$/).optional().transform((value) => Number(value ?? "1")).refine((value) => value >= 1),
  ),
});

interface SearchParams {
  q?: string;
  desde?: string;
  hasta?: string;
  tipo?: string;
  mecanicoId?: string;
  page?: string;
}

function dayAfter(date: string) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + 1);
  return result.toISOString();
}

function pageHref(searchParams: SearchParams, page: number) {
  const params = new URLSearchParams();
  for (const key of ["q", "desde", "hasta", "tipo", "mecanicoId"] as const) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/historial?${params.toString()}`;
}

export default async function HistorySearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawFilters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const parsed = filtersSchema.safeParse(rawFilters);
  const validFilters = parsed.success ? parsed.data : null;
  const filtersError = parsed.success
    ? parsed.data.desde && parsed.data.hasta && parsed.data.desde > parsed.data.hasta
      ? "La fecha inicial no puede ser posterior a la fecha final."
      : ""
    : "Uno o más filtros no tienen un formato válido.";
  const searchFilters = validFilters ?? {
    q: rawFilters.q ?? "",
    desde: rawFilters.desde,
    hasta: rawFilters.hasta,
    tipo: rawFilters.tipo,
    mecanicoId: rawFilters.mecanicoId,
    page: 1,
  };
  const activeFilters = validFilters && !filtersError ? validFilters : null;
  const [mechanicsResult, ordersResult] = await Promise.all([
    supabase.from("profiles").select("id, nombre").eq("rol", "mecanico").eq("activo", true).order("nombre"),
    (async () => {
      if (!activeFilters) return { data: [], error: null, count: 0 };
      const pageSize = 50;
      let query = supabase
        .from("ordenes_trabajo")
        .select(
          "id, vehiculo_id, mecanico_id, estado, descripcion_trabajo, tipo_servicio, fecha_ingreso, fecha_entrega_real, vehiculos!inner(placa, marca, modelo, propietario_nombre)",
          { count: "exact" },
        )
        .in("estado", ["ENTREGADO", "CANCELADO"])
        .order("fecha_ingreso", { ascending: false })
        .range((activeFilters.page - 1) * pageSize, activeFilters.page * pageSize - 1);
      if (activeFilters.q) query = query.ilike("vehiculos.placa", `%${activeFilters.q}%`);
      if (activeFilters.desde) query = query.gte("fecha_ingreso", `${activeFilters.desde}T00:00:00.000Z`);
      if (activeFilters.hasta) query = query.lt("fecha_ingreso", dayAfter(activeFilters.hasta));
      if (activeFilters.tipo) query = query.eq("tipo_servicio", activeFilters.tipo);
      if (activeFilters.mecanicoId) query = query.eq("mecanico_id", activeFilters.mecanicoId);
      const result = await query;
      return { ...result, count: result.count ?? 0 };
    })(),
  ]);

  if (mechanicsResult.error) {
    throw new Error(`No se pudo cargar el personal para el historial: ${mechanicsResult.error.message}`);
  }
  if (ordersResult.error) {
    throw new Error(`No se pudo buscar en el historial: ${ordersResult.error.message}`);
  }

  const mechanicIds = Array.from(new Set(ordersResult.data.map((order) => order.mecanico_id).filter((id): id is string => Boolean(id))));
  const namesResult = mechanicIds.length
    ? await supabase.from("profiles").select("id, nombre").in("id", mechanicIds)
    : { data: [], error: null };
  if (namesResult.error) throw new Error(`No se pudo cargar el personal asignado: ${namesResult.error.message}`);
  const mechanicNames = new Map((namesResult.data ?? []).map((profile) => [profile.id, profile.nombre]));
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(ordersResult.count / pageSize));
  const currentPage = activeFilters?.page ?? 1;

  return (
      <main className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Registro de servicio</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Búsqueda histórica</h1>
          <p className="mt-2 text-sm text-muted">Encuentra órdenes cerradas por placa, fechas, servicio o mecánico.</p>
        </header>
        <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
          <label className="text-xs font-medium text-muted lg:col-span-2">
            Placa
            <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" defaultValue={searchFilters.q} maxLength={12} name="q" placeholder="Ej. ABC-123" />
          </label>
          <label className="text-xs font-medium text-muted">
            Desde
            <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" defaultValue={searchFilters.desde} name="desde" type="date" />
          </label>
          <label className="text-xs font-medium text-muted">
            Hasta
            <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" defaultValue={searchFilters.hasta} name="hasta" type="date" />
          </label>
          <label className="text-xs font-medium text-muted">
            Tipo de servicio
            <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" defaultValue={searchFilters.tipo} name="tipo">
              <option value="">Todos</option>
              {serviceTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Mecánico
            <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" defaultValue={searchFilters.mecanicoId} name="mecanicoId">
              <option value="">Todos</option>
              {mechanicsResult.data.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.nombre}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2 lg:col-span-6">
            <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" type="submit">Buscar</button>
            <Link className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink" href="/historial">Limpiar</Link>
          </div>
        </form>
        {filtersError && <p className="text-sm text-red-700" role="alert">{filtersError}</p>}
        {activeFilters && (
          <>
            <p className="text-sm text-muted">{ordersResult.count} órdenes cerradas encontradas.</p>
            {ordersResult.data.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No hay órdenes que coincidan con esos filtros.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-mist text-xs uppercase tracking-wide text-muted">
                    <tr><th className="px-4 py-3">Vehículo</th><th className="px-4 py-3">Servicio</th><th className="px-4 py-3">Mecánico</th><th className="px-4 py-3">Ingreso</th><th className="px-4 py-3">Cierre</th><th className="px-4 py-3">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ordersResult.data.map((order) => {
                      const vehicle = Array.isArray(order.vehiculos) ? order.vehiculos[0] : order.vehiculos;
                      const status = ESTADOS[order.estado as keyof typeof ESTADOS];
                      return (
                        <tr key={order.id}>
                          <td className="px-4 py-4">
                            <Link className="font-medium text-ink underline" href={`/historial/${order.vehiculo_id}`}>{vehicle?.placa} · {vehicle?.marca} {vehicle?.modelo}</Link>
                            <Link className="mt-1 block text-xs text-muted underline" href={`/ordenes/${order.id}`}>Orden {order.id.slice(0, 8).toUpperCase()}</Link>
                          </td>
                          <td className="px-4 py-4 text-ink">{order.tipo_servicio}<span className="mt-1 block max-w-xs truncate text-xs text-muted">{order.descripcion_trabajo}</span></td>
                          <td className="px-4 py-4 text-ink">{order.mecanico_id ? mechanicNames.get(order.mecanico_id) ?? "Personal no disponible" : "Sin asignar"}</td>
                          <td className="px-4 py-4 text-ink">{new Date(order.fecha_ingreso).toLocaleDateString("es-MX")}</td>
                          <td className="px-4 py-4 text-ink">{order.fecha_entrega_real ? new Date(order.fecha_entrega_real).toLocaleDateString("es-MX") : "—"}</td>
                          <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status?.color ?? "bg-mist text-ink"}`}>{status?.label ?? order.estado}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {ordersResult.count > pageSize && (
              <nav aria-label="Paginación del historial" className="flex items-center justify-between">
                <span className="text-sm text-muted">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  {currentPage > 1 && <Link className="rounded-lg border border-line px-3 py-2 text-sm text-ink" href={pageHref(rawFilters, currentPage - 1)}>Anterior</Link>}
                  {currentPage < totalPages && <Link className="rounded-lg border border-line px-3 py-2 text-sm text-ink" href={pageHref(rawFilters, currentPage + 1)}>Siguiente</Link>}
                </div>
              </nav>
            )}
          </>
        )}
      </main>
  );
}
