import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ESTADOS } from "@/lib/estados";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) throw new Error("Inicia sesión para consultar órdenes.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  if (profileError) throw new Error(`No se pudo consultar el perfil: ${profileError.message}`);
  const q = searchParams.q?.trim().replace(/[%_,]/g, "") ?? "";
  let query = supabase.from("ordenes_trabajo")
    .select("id, vehiculo_id, mecanico_id, estado, descripcion_trabajo, tipo_servicio, fecha_ingreso, fecha_estimada_entrega, vehiculos!inner(placa, marca, modelo, propietario_nombre)")
    .order("fecha_ingreso", { ascending: false })
    .limit(300);
  if (searchParams.estado && Object.hasOwn(ESTADOS, searchParams.estado)) query = query.eq("estado", searchParams.estado);
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

  return (
    <main className="space-y-6">
      <RealtimeRefresher tables={["ordenes_trabajo"]} />
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operación diaria</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Órdenes de trabajo</h1><p className="mt-2 text-sm text-muted">Consulta estado, vehículo y seguimiento de cada servicio.</p></div><span className="rounded-full bg-mist px-3 py-1.5 text-sm font-medium text-ink">{visible.length} órdenes</span></header>
      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_220px_auto]" method="get">
        <input aria-label="Buscar órdenes" className="rounded-lg border border-line px-3 py-2.5 text-sm" name="q" defaultValue={searchParams.q} placeholder="Buscar por placa, cliente o número" />
        <select aria-label="Filtrar por estado" className="rounded-lg border border-line px-3 py-2.5 text-sm" name="estado" defaultValue={searchParams.estado ?? ""}><option value="">Todos los estados</option>{Object.entries(ESTADOS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>
        <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" type="submit">Buscar</button>
      </form>
      {visible.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No se encontraron órdenes.</p> : (
        <div className="grid gap-3">{visible.map((order) => {
          const vehicle = Array.isArray(order.vehiculos) ? order.vehiculos[0] : order.vehiculos;
          const status = ESTADOS[order.estado as keyof typeof ESTADOS];
          return <Link className="grid gap-3 rounded-2xl border border-line bg-white p-5 transition hover:border-ink/30 hover:shadow-soft sm:grid-cols-[1fr_auto] sm:items-center" href={`/ordenes/${order.id}`} key={order.id}>
            <span><span className="block font-semibold text-ink">{vehicle?.marca} {vehicle?.modelo} · {vehicle?.placa}</span><span className="mt-1 block text-sm text-muted">{vehicle?.propietario_nombre || "Propietario sin registrar"} · {order.descripcion_trabajo}</span><span className="mt-2 block text-xs text-muted">Ingreso {new Date(order.fecha_ingreso).toLocaleDateString("es-MX")}</span></span>
            <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${status?.color ?? "bg-mist text-ink"}`}>{status?.label ?? order.estado}</span>
          </Link>;
        })}</div>
      )}
    </main>
  );
}
