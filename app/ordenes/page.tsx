import Link from "next/link";
import { ArrowUpRight, CalendarDays, CarFront, ClipboardList, Search, Wrench } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";
import { PageHero, PageHeroStat } from "@/app/components/ui/page-hero";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) throw new Error("Inicia sesión para consultar órdenes.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  if (profileError) throw new Error(`No se pudo consultar el perfil: ${profileError.message}`);
  const q = filters.q?.trim().replace(/[%_,]/g, "") ?? "";
  const statusFilter = ACTIVE_STATUSES.find((status) => status === filters.estado);
  let query = supabase.from("ordenes_trabajo")
    .select("id, vehiculo_id, mecanico_id, estado, descripcion_trabajo, tipo_servicio, fecha_ingreso, fecha_estimada_entrega, vehiculos!inner(placa, marca, modelo, propietario_nombre)")
    .in("estado", [...ACTIVE_STATUSES])
    .order("fecha_ingreso", { ascending: false })
    .limit(300);
  if (statusFilter) query = query.eq("estado", statusFilter);
  if (profile.rol === "mecanico") query = query.eq("mecanico_id", user.id);
  const { data: orders, error } = await query;
  if (error) throw new Error(`No se pudieron cargar las órdenes: ${error.message}`);
  const visible = q
    ? orders.filter((order) => {
        const vehicle = Array.isArray(order.vehiculos) ? order.vehiculos[0] : order.vehiculos;
        const terms = [order.id, order.descripcion_trabajo, vehicle?.placa, vehicle?.propietario_nombre];
        return terms.some((term) => term?.toLowerCase().includes(q.toLowerCase()));
      })
    : orders;
  const inProgressCount = visible.filter((order) => order.estado !== "LISTO").length;
  const readyCount = visible.filter((order) => order.estado === "LISTO").length;

  return (
      <main className="admin-stagger space-y-7">
        <RealtimeRefresher tables={["ordenes_trabajo"]} />
        <PageHero
          action={profile.rol !== "mecanico" ? (
            <Link className="group inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/ordenes/nueva">
              Abrir orden
              <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </Link>
          ) : undefined}
          description="Aquí aparecen solo órdenes en curso. Las entregadas al cliente y canceladas quedan en el historial de su vehículo."
          eyebrow="Operación diaria"
          icon={Wrench}
          title="Órdenes de trabajo"
        >
          <PageHeroStat icon={ClipboardList} label="Órdenes activas" value={visible.length} />
          <PageHeroStat icon={Wrench} label="En proceso" value={inProgressCount} />
          <PageHeroStat icon={CarFront} label="Listas para entrega" value={readyCount} />
        </PageHero>
        <form className="admin-reveal rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-5" method="get">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="grid size-8 place-items-center rounded-xl bg-mist text-ink"><Search className="size-4" aria-hidden="true" /></span>
            Encuentra una orden
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_240px_auto]">
            <input aria-label="Buscar órdenes" className="min-w-0 rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" name="q" defaultValue={filters.q} placeholder="Placa, cliente o número de orden" />
            <select aria-label="Filtrar por estado" className="rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10" name="estado" defaultValue={ACTIVE_STATUSES.some((status) => status === filters.estado) ? filters.estado : ""}><option value="">Todas las órdenes activas</option>{ACTIVE_STATUSES.map((status) => <option key={status} value={status}>{ESTADOS[status].label}</option>)}</select>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" type="submit"><Search className="size-4" aria-hidden="true" />Buscar</button>
          </div>
        </form>
        {visible.length === 0 ? <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">No hay órdenes activas que coincidan. Las órdenes entregadas al cliente o canceladas se consultan desde el historial de cada vehículo.</p> : (
          <div className="grid gap-3 md:grid-cols-2">{visible.map((order, index) => {
            const vehicle = Array.isArray(order.vehiculos) ? order.vehiculos[0] : order.vehiculos;
            const status = ESTADOS[order.estado as keyof typeof ESTADOS];
            return <Link className="admin-reveal group relative overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-[0_12px_35px_-28px_rgba(37,41,39,0.35)] transition duration-300 hover:-translate-y-1 hover:border-emerald-900/20 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" href={`/ordenes/${order.id}`} key={order.id} style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mist text-ink transition duration-300 group-hover:scale-105"><CarFront className="size-5" aria-hidden="true" /></span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status?.color ?? "bg-mist text-ink"}`}>{status?.label ?? order.estado}</span>
              </div>
              <div className="mt-4">
                <span className="block text-lg font-semibold tracking-tight text-ink">{vehicle?.marca} {vehicle?.modelo} <span className="font-normal text-muted">· {vehicle?.placa}</span></span>
                <span className="mt-1 block text-sm text-muted">{vehicle?.propietario_nombre || "Propietario sin registrar"}</span>
              </div>
              <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-ink">{order.descripcion_trabajo || order.tipo_servicio}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />Ingreso {new Date(order.fecha_ingreso).toLocaleDateString("es-MX")}</span>
                <span className="font-medium text-ink">{order.tipo_servicio}</span>
              </div>
              <span className="pointer-events-none absolute bottom-4 right-4 grid size-8 translate-y-1 place-items-center rounded-full bg-mist text-ink opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </span>
            </Link>;
          })}</div>
        )}
    </main>
  );
}
