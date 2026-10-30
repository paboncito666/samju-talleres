import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    mecanicoId?: string;
    desde?: string;
    hasta?: string;
    verTodos?: string;
  }>;
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const queryText = filters.q?.trim().replace(/[%_,]/g, "") ?? "";
  const statusFilter = Object.keys(ESTADOS).find((status) => status === filters.estado);
  const includeAllVehicles = filters.verTodos === "1";
  const hasOrderFilters = Boolean(statusFilter || filters.mecanicoId || filters.desde || filters.hasta);
  const [{ data: staff, error: staffError }, { data: vehicles, error: vehicleError }] =
    await Promise.all([
      supabase.from("profiles").select("id, nombre").eq("rol", "mecanico").eq("activo", true).order("nombre"),
      (() => {
        let query = supabase.from("vehiculos")
          .select("id, placa, marca, modelo, anio, color, kilometraje, propietario_nombre, propietario_telefono")
          .order("placa").limit(300);
        if (queryText) query = query.or(`placa.ilike.%${queryText}%,propietario_nombre.ilike.%${queryText}%`);
        return query;
      })(),
    ]);
  if (staffError) throw new Error(`No se pudo consultar el personal: ${staffError.message}`);
  if (vehicleError) throw new Error(`No se pudieron consultar los vehículos: ${vehicleError.message}`);

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  let orders: {
    id: string;
    vehiculo_id: string;
    estado: keyof typeof ESTADOS;
    mecanico_id: string | null;
    fecha_ingreso: string;
  }[] = [];
  if (vehicleIds.length) {
    let orderQuery = supabase.from("ordenes_trabajo")
      .select("id, vehiculo_id, estado, mecanico_id, fecha_ingreso")
      .in("vehiculo_id", vehicleIds)
      .order("fecha_ingreso", { ascending: false })
      .limit(1000);
    if (statusFilter) orderQuery = orderQuery.eq("estado", statusFilter);
    else if (!includeAllVehicles) orderQuery = orderQuery.in("estado", [...ACTIVE_STATUSES]);
    if (filters.mecanicoId) orderQuery = orderQuery.eq("mecanico_id", filters.mecanicoId);
    if (filters.desde) orderQuery = orderQuery.gte("fecha_ingreso", `${filters.desde}T00:00:00`);
    if (filters.hasta) orderQuery = orderQuery.lte("fecha_ingreso", `${filters.hasta}T23:59:59`);
    const result = await orderQuery;
    if (result.error) throw new Error(`No se pudieron filtrar las órdenes: ${result.error.message}`);
    orders = result.data;
  }
  const orderByVehicle = new Map<string, (typeof orders)[number]>();
  for (const order of orders) if (!orderByVehicle.has(order.vehiculo_id)) orderByVehicle.set(order.vehiculo_id, order);
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (hasOrderFilters || !includeAllVehicles) return orderByVehicle.has(vehicle.id);
    return true;
  });

  return (
    <main className="space-y-6">
      <RealtimeRefresher tables={["ordenes_trabajo", "vehiculos"]} />
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Flota del taller</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Vehículos</h1><p className="mt-2 text-sm text-muted">Busca por placa o propietario y revisa el historial de servicio.</p></div><Link className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" href="/vehiculos/nuevo">Registrar vehículo</Link></header>
      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-6" method="get">
        <label className="text-xs font-medium text-muted lg:col-span-2">Placa o propietario<input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" name="q" defaultValue={filters.q} placeholder="Ej. ABC-123" /></label>
        <label className="text-xs font-medium text-muted">Estado de orden<select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" name="estado" defaultValue={statusFilter ?? ""}><option value="">Todos los estados activos</option>{Object.entries(ESTADOS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
        <label className="text-xs font-medium text-muted">Mecánico<select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" name="mecanicoId" defaultValue={filters.mecanicoId ?? ""}><option value="">Todos</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}</select></label>
        <label className="text-xs font-medium text-muted">Desde<input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" type="date" name="desde" defaultValue={filters.desde} /></label>
        <label className="text-xs font-medium text-muted">Hasta<input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" type="date" name="hasta" defaultValue={filters.hasta} /></label>
        <label className="flex items-center gap-2 text-xs font-medium text-muted lg:col-span-3"><input type="checkbox" name="verTodos" value="1" defaultChecked={includeAllVehicles} />Incluir vehículos sin órdenes activas</label>
        <div className="flex gap-2 lg:col-span-6"><button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" type="submit">Aplicar filtros</button><Link className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink" href="/vehiculos">Limpiar</Link></div>
      </form>
      {filteredVehicles.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No hay vehículos para los filtros seleccionados.</p> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
          <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-mist text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Vehículo</th><th className="px-4 py-3">Propietario</th><th className="px-4 py-3">Kilometraje</th><th className="px-4 py-3">Última orden</th><th className="px-4 py-3">Historial</th></tr></thead>
            <tbody className="divide-y divide-line">{filteredVehicles.map((vehicle) => {
              const order = orderByVehicle.get(vehicle.id);
              return <tr key={vehicle.id}><td className="px-4 py-4"><Link className="block font-semibold text-ink underline" href={`/vehiculos/${vehicle.id}`}>{vehicle.marca} {vehicle.modelo} {vehicle.anio ?? ""}</Link><span className="text-xs text-muted">{vehicle.placa}{vehicle.color ? ` · ${vehicle.color}` : ""}</span></td><td className="px-4 py-4 text-ink">{vehicle.propietario_nombre || "Sin registrar"}</td><td className="px-4 py-4 text-ink">{new Intl.NumberFormat("es-MX").format(vehicle.kilometraje)} km</td><td className="px-4 py-4">{order ? <Link className="font-medium text-ink underline" href={`/ordenes/${order.id}`}>{ESTADOS[order.estado]?.label ?? order.estado}</Link> : <span className="text-muted">Sin órdenes</span>}</td><td className="px-4 py-4"><Link className="font-medium text-ink underline" href={`/historial/${vehicle.id}`}>Ver historial</Link></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
