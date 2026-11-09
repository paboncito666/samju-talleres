import Link from "next/link";
import { ArrowUpRight, CarFront, Check, ClipboardList, Gauge, Search, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";
import { PageHero, PageHeroStat } from "@/app/components/ui/page-hero";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    mecanicoId?: string;
    desde?: string;
    hasta?: string;
    soloActivos?: string;
  }>;
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const queryText = filters.q?.trim().replace(/[%_,]/g, "") ?? "";
  const statusFilter = ACTIVE_STATUSES.find((status) => status === filters.estado);
  const onlyVehiclesWithActiveOrders = filters.soloActivos === "1";
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
      .in("estado", [...ACTIVE_STATUSES])
      .order("fecha_ingreso", { ascending: false })
      .limit(1000);
    if (statusFilter) orderQuery = orderQuery.eq("estado", statusFilter);
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
    if (hasOrderFilters || onlyVehiclesWithActiveOrders) return orderByVehicle.has(vehicle.id);
    return true;
  });
  const vehiclesWithOrders = filteredVehicles.filter((vehicle) => orderByVehicle.has(vehicle.id)).length;

  return (
    <main className="admin-stagger space-y-7">
      <RealtimeRefresher tables={["ordenes_trabajo", "vehiculos"]} />
      <PageHero
        action={
          <Link className="group inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/vehiculos/nuevo">
            Registrar vehículo
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        }
        description="La flota permanece visible aunque no tenga trabajo en curso. Las órdenes cerradas se consultan desde el historial de cada vehículo."
        eyebrow="Flota del taller"
        icon={CarFront}
        title="Vehículos"
      >
        <PageHeroStat icon={CarFront} label="Vehículos registrados" value={filteredVehicles.length} />
        <PageHeroStat icon={ClipboardList} label="Con órdenes activas" value={vehiclesWithOrders} />
        <PageHeroStat icon={UserRound} label="Sin órdenes activas" value={filteredVehicles.length - vehiclesWithOrders} />
      </PageHero>
      <form className="admin-reveal rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-5" method="get">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="grid size-8 place-items-center rounded-xl bg-mist"><Search className="size-4" aria-hidden="true" /></span>
          Busca y filtra la flota
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-medium text-muted lg:col-span-2">Placa o propietario<input className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" name="q" defaultValue={filters.q} placeholder="Ej. ABC-123" /></label>
        <label className="text-xs font-medium text-muted">Estado de orden activa<select className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" name="estado" defaultValue={statusFilter ?? ""}><option value="">Cualquier estado activo</option>{ACTIVE_STATUSES.map((value) => <option key={value} value={value}>{ESTADOS[value].label}</option>)}</select></label>
        <label className="text-xs font-medium text-muted">Mecánico<select className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" name="mecanicoId" defaultValue={filters.mecanicoId ?? ""}><option value="">Todos</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}</select></label>
        <label className="text-xs font-medium text-muted">Desde<input className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" type="date" name="desde" defaultValue={filters.desde} /></label>
        <label className="text-xs font-medium text-muted">Hasta<input className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" type="date" name="hasta" defaultValue={filters.hasta} /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-background px-3 py-3 text-xs font-medium text-muted lg:col-span-3"><input className="size-4 accent-emerald-800" type="checkbox" name="soloActivos" value="1" defaultChecked={onlyVehiclesWithActiveOrders} />Mostrar solo vehículos con órdenes activas</label>
        <div className="flex items-center gap-2 lg:col-span-3"><button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" type="submit"><Search className="size-4" aria-hidden="true" />Aplicar filtros</button><Link className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-mist" href="/vehiculos">Limpiar</Link></div>
        </div>
      </form>
      {filteredVehicles.length === 0 ? <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">No hay vehículos para los filtros seleccionados. Ajusta la búsqueda o incluye vehículos sin órdenes activas.</p> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredVehicles.map((vehicle, index) => {
              const order = orderByVehicle.get(vehicle.id);
              const status = order ? ESTADOS[order.estado] : null;
              return <article className="admin-reveal group rounded-3xl border border-line bg-white p-5 shadow-[0_12px_35px_-28px_rgba(37,41,39,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-soft" key={vehicle.id} style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-mist text-ink transition duration-300 group-hover:scale-105"><CarFront className="size-6" aria-hidden="true" /></span>
                  {status ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>Orden · {status.label}</span> : <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted">Sin órdenes</span>}
                </div>
                <Link className="mt-4 block text-lg font-semibold tracking-tight text-ink underline decoration-emerald-200 underline-offset-4" href={`/vehiculos/${vehicle.id}`}>{vehicle.marca} {vehicle.modelo} {vehicle.anio ?? ""}</Link>
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1 text-xs font-semibold tracking-wide text-ink"><Check className="size-3.5 text-emerald-800" aria-hidden="true" />{vehicle.placa}{vehicle.color ? ` · ${vehicle.color}` : ""}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                  <div className="min-w-0"><p className="text-xs text-muted">Propietario</p><p className="mt-1 truncate font-medium text-ink">{vehicle.propietario_nombre || "Sin registrar"}</p></div>
                  <div><p className="text-xs text-muted">Kilometraje</p><p className="mt-1 inline-flex items-center gap-1.5 font-medium text-ink"><Gauge className="size-3.5 text-muted" aria-hidden="true" />{new Intl.NumberFormat("es-MX").format(vehicle.kilometraje)} km</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-background px-3 py-2.5">
                  <span className="text-xs text-muted">{order ? "Orden activa más reciente" : "Estado operativo"}</span>
                  {order ? <Link className="text-xs font-semibold text-ink underline decoration-line underline-offset-4" href={`/ordenes/${order.id}`}>{status?.label ?? order.estado}</Link> : <span className="text-xs font-medium text-muted">Sin órdenes activas</span>}
                </div>
                <Link className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-900 transition group-hover:gap-2.5" href={`/historial/${vehicle.id}`}>Ver historial <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              </article>;
            })}
        </div>
      )}
    </main>
  );
}
