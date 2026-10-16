import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ESTADOS } from "@/lib/estados";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    q?: string;
    estado?: string;
    mecanicoId?: string;
    desde?: string;
    hasta?: string;
  };
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const queryText = searchParams.q?.trim().replace(/[%_,]/g, "") ?? "";
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
    if (searchParams.estado && Object.hasOwn(ESTADOS, searchParams.estado)) {
      orderQuery = orderQuery.eq("estado", searchParams.estado);
    }
    if (searchParams.mecanicoId) orderQuery = orderQuery.eq("mecanico_id", searchParams.mecanicoId);
    if (searchParams.desde) orderQuery = orderQuery.gte("fecha_ingreso", `${searchParams.desde}T00:00:00`);
    if (searchParams.hasta) orderQuery = orderQuery.lte("fecha_ingreso", `${searchParams.hasta}T23:59:59`);
    const result = await orderQuery;
    if (result.error) throw new Error(`No se pudieron filtrar las órdenes: ${result.error.message}`);
    orders = result.data;
  }
  const orderByVehicle = new Map<string, (typeof orders)[number]>();
  for (const order of orders) if (!orderByVehicle.has(order.vehiculo_id)) orderByVehicle.set(order.vehiculo_id, order);
  const filteredVehicles = (searchParams.estado || searchParams.mecanicoId || searchParams.desde || searchParams.hasta)
    ? vehicles.filter((vehicle) => orderByVehicle.has(vehicle.id))
    : vehicles;

  return (
    <main className="space-y-6">
      <RealtimeRefresher tables={["ordenes_trabajo", "vehiculos"]} />
      <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Flota del taller</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Vehículos</h1><p className="mt-2 text-sm text-muted">Busca por placa o propietario y revisa el historial de servicio.</p></header>
      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-6" method="get">
        <label className="text-xs font-medium text-muted lg:col-span-2">Placa o propietario<input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" name="q" defaultValue={searchParams.q} placeholder="Ej. ABC-123" /></label>
        <label className="text-xs font-medium text-muted">Estado de orden<select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" name="estado" defaultValue={searchParams.estado ?? ""}><option value="">Todos</option>{Object.entries(ESTADOS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
        <label className="text-xs font-medium text-muted">Mecánico<select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" name="mecanicoId" defaultValue={searchParams.mecanicoId ?? ""}><option value="">Todos</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}</select></label>
        <label className="text-xs font-medium text-muted">Desde<input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" type="date" name="desde" defaultValue={searchParams.desde} /></label>
        <label className="text-xs font-medium text-muted">Hasta<input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" type="date" name="hasta" defaultValue={searchParams.hasta} /></label>
        <div className="flex gap-2 lg:col-span-6"><button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" type="submit">Aplicar filtros</button><Link className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink" href="/vehiculos">Limpiar</Link></div>
      </form>
      {filteredVehicles.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No hay vehículos para los filtros seleccionados.</p> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
          <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-mist text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Vehículo</th><th className="px-4 py-3">Propietario</th><th className="px-4 py-3">Kilometraje</th><th className="px-4 py-3">Última orden</th><th className="px-4 py-3">Historial</th></tr></thead>
            <tbody className="divide-y divide-line">{filteredVehicles.map((vehicle) => {
              const order = orderByVehicle.get(vehicle.id);
              return <tr key={vehicle.id}><td className="px-4 py-4"><span className="block font-semibold text-ink">{vehicle.marca} {vehicle.modelo} {vehicle.anio ?? ""}</span><span className="text-xs text-muted">{vehicle.placa}{vehicle.color ? ` · ${vehicle.color}` : ""}</span></td><td className="px-4 py-4 text-ink">{vehicle.propietario_nombre || "Sin registrar"}</td><td className="px-4 py-4 text-ink">{new Intl.NumberFormat("es-MX").format(vehicle.kilometraje)} km</td><td className="px-4 py-4">{order ? <Link className="font-medium text-ink underline" href={`/ordenes/${order.id}`}>{ESTADOS[order.estado]?.label ?? order.estado}</Link> : <span className="text-muted">Sin órdenes</span>}</td><td className="px-4 py-4"><Link className="font-medium text-ink underline" href={`/historial/${vehicle.id}`}>Ver historial</Link></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
