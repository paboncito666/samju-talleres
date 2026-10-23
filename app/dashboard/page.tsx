import Link from "next/link";
import { Activity, ClipboardList, Clock3, Wrench } from "lucide-react";
import { DashboardCharts } from "@/app/components/dashboard/charts";
import { ProfileNameCard } from "@/app/components/dashboard/profile-name-card";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface DashboardPageProps {
  searchParams: { profileNameError?: string; profileNameUpdated?: string };
}

export const dynamic = "force-dynamic";

const colors = [
  "#b8c9d9", "#c9bfdc", "#eadcae", "#eac5ad",
  "#a9d1c4", "#c0d49f", "#c9c9ce", "#e1b8bd",
];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) throw new Error("Inicia sesión para consultar el dashboard.");

  const [ordersResult, mechanicsResult, profileResult] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, estado, fecha_ingreso, fecha_entrega_real, mecanico_id")
      .order("fecha_ingreso", { ascending: false }),
    supabase.from("profiles").select("id, nombre").eq("rol", "mecanico").eq("activo", true),
    supabase
      .from("profiles")
      .select("nombre_confirmado")
      .eq("id", user.id)
      .single(),
  ]);
  if (ordersResult.error) throw new Error(`No se pudieron cargar las órdenes: ${ordersResult.error.message}`);
  if (mechanicsResult.error) throw new Error(`No se pudo cargar el personal: ${mechanicsResult.error.message}`);
  if (profileResult.error) throw new Error(`No se pudo cargar el perfil: ${profileResult.error.message}`);

  const orders = ordersResult.data;
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.estado));
  const activeOrderIds = active.map((order) => order.id);
  const historyResult = activeOrderIds.length
    ? await supabase
        .from("historial_estados")
        .select("orden_id, creado_en")
        .in("orden_id", activeOrderIds)
        .order("creado_en", { ascending: false })
    : { data: [], error: null };
  if (historyResult.error) {
    throw new Error(`No se pudo consultar el avance de las órdenes: ${historyResult.error.message}`);
  }
  const latestStatusChange = new Map<string, string>();
  for (const event of historyResult.data ?? []) {
    if (!latestStatusChange.has(event.orden_id)) {
      latestStatusChange.set(event.orden_id, event.creado_en);
    }
  }
  const alertThresholdDays = 3;
  const staleOrders = active
    .map((order) => {
      const lastAdvance = latestStatusChange.get(order.id) ?? order.fecha_ingreso;
      return {
        ...order,
        lastAdvance,
        staleDays: Math.floor((Date.now() - new Date(lastAdvance).getTime()) / 86_400_000),
      };
    })
    .filter((order) => order.staleDays >= alertThresholdDays)
    .sort((a, b) => b.staleDays - a.staleDays);
  const delivered = orders.filter((order) => order.estado === "ENTREGADO" && order.fecha_entrega_real);
  const averageDays = delivered.length
    ? delivered.reduce((sum, order) => sum + Math.max(
        0,
        (new Date(order.fecha_entrega_real!).getTime() - new Date(order.fecha_ingreso).getTime()) / 86_400_000,
      ), 0) / delivered.length
    : 0;
  const byStatus = Object.entries(ESTADOS).map(([status, details], index) => ({
    name: details.label,
    total: orders.filter((order) => order.estado === status).length,
    color: colors[index],
  }));
  const byMechanic = mechanicsResult.data.map((mechanic) => ({
    name: mechanic.nombre,
    total: active.filter((order) => order.mecanico_id === mechanic.id).length,
  }));

  const kpis = [
    { label: "Órdenes activas", value: active.length, icon: ClipboardList },
    { label: "Listas para entrega", value: orders.filter((order) => order.estado === "LISTO").length, icon: Activity },
    { label: "En reparación", value: orders.filter((order) => order.estado === "REPARACION").length, icon: Wrench },
    { label: "Promedio de reparación", value: `${averageDays.toFixed(1)} días`, icon: Clock3 },
  ];

  return (
    <main className="space-y-7">
      <RealtimeRefresher tables={["ordenes_trabajo", "historial_estados"]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Resumen operativo</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Dashboard</h1><p className="mt-2 text-sm text-muted">Estado general del taller y carga de trabajo.</p></div>
        <Link className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90" href="/ordenes">Ver órdenes</Link>
      </header>
      {!profileResult.data.nombre_confirmado && (
        <ProfileNameCard error={searchParams.profileNameError} userId={user.id} />
      )}
      {searchParams.profileNameUpdated === "1" && (
        <p className="rounded-xl border border-sage-foreground/20 bg-white p-4 text-sm text-ink" role="status">
          Tu nombre se actualizó correctamente.
        </p>
      )}
      <section
        aria-label="Alertas de órdenes sin avances"
        className={`rounded-2xl border p-5 ${staleOrders.length ? "border-amber-300 bg-amber-50" : "border-line bg-white"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Alertas de seguimiento</h2>
            <p className="mt-1 text-sm text-muted">
              Órdenes activas sin cambios de estado durante {alertThresholdDays} días o más.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">
            {staleOrders.length}
          </span>
        </div>
        {staleOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No hay órdenes pendientes de avance.</p>
        ) : (
          <ul className="mt-4 divide-y divide-amber-200">
            {staleOrders.map((order) => (
              <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={order.id}>
                <div>
                  <Link className="font-medium text-ink underline" href={`/ordenes/${order.id}`}>
                    Orden {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {ESTADOS[order.estado as keyof typeof ESTADOS]?.label ?? order.estado} · {order.staleDays} días sin cambio
                  </p>
                </div>
                <Link className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-ink" href={`/ordenes/${order.id}`}>
                  Revisar orden
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <article className="rounded-2xl border border-line bg-white p-5 shadow-soft" key={label}>
            <div className="flex items-start justify-between"><p className="text-sm text-muted">{label}</p><Icon aria-hidden="true" className="text-muted" size={18} /></div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">{value}</p>
          </article>
        ))}
      </section>
      <DashboardCharts byStatus={byStatus} byMechanic={byMechanic} />
    </main>
  );
}
