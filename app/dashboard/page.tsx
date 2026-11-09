import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  Clock3,
  Gauge,
  UsersRound,
  Wrench,
} from "lucide-react";
import { DashboardCharts } from "@/app/components/dashboard/charts";
import { ProfileNameCard } from "@/app/components/dashboard/profile-name-card";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";
import { PageHero, PageHeroStat } from "@/app/components/ui/page-hero";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getStaleDays(lastAdvance: string) {
  return Math.floor((Date.now() - new Date(lastAdvance).getTime()) / 86_400_000);
}

interface DashboardPageProps {
  searchParams: Promise<{ profileNameError?: string; profileNameUpdated?: string }>;
}

export const dynamic = "force-dynamic";

const colors = [
  "#b8c9d9", "#c9bfdc", "#eadcae", "#eac5ad",
  "#a9d1c4", "#c0d49f", "#c9c9ce", "#e1b8bd",
];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const notices = await searchParams;
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
        staleDays: getStaleDays(lastAdvance),
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
    <main className="admin-stagger space-y-7">
      <RealtimeRefresher tables={["ordenes_trabajo", "historial_estados"]} />
      <PageHero
        action={
          <Link className="group inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/ordenes">
            Ver órdenes
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        }
        description="Una vista clara del ritmo del taller, los servicios y la carga del equipo."
        eyebrow="Resumen operativo"
        icon={Gauge}
        title="Así marcha el taller"
      >
        <PageHeroStat icon={ClipboardList} label="Órdenes activas" value={active.length} />
        <PageHeroStat icon={AlertTriangle} label="Requieren seguimiento" value={staleOrders.length} />
        <PageHeroStat icon={UsersRound} label="Mecánicos activos" value={mechanicsResult.data.length} />
      </PageHero>
      {!profileResult.data.nombre_confirmado && (
        <ProfileNameCard error={notices.profileNameError} userId={user.id} />
      )}
      {notices.profileNameUpdated === "1" && (
        <p className="admin-reveal rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          Tu nombre se actualizó correctamente.
        </p>
      )}
      <section
        aria-label="Alertas de órdenes sin avances"
        className={`admin-reveal relative overflow-hidden rounded-3xl border p-5 shadow-soft transition duration-300 sm:p-6 ${staleOrders.length ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white" : "border-line bg-white"}`}
      >
        {staleOrders.length > 0 && <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-52 rounded-full bg-amber-100/70 blur-3xl" />}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="relative flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${staleOrders.length ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
              {staleOrders.length ? <AlertTriangle className="size-5" aria-hidden="true" /> : <Activity className="size-5" aria-hidden="true" />}
            </span>
            <div>
            <h2 className="text-lg font-semibold text-ink">Alertas de seguimiento</h2>
            <p className="mt-1 text-sm text-muted">
              Órdenes activas sin cambios de estado durante {alertThresholdDays} días o más.
            </p>
            </div>
          </div>
          <span className={`relative rounded-full px-3 py-1 text-sm font-semibold ${staleOrders.length ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
            {staleOrders.length}
          </span>
        </div>
        {staleOrders.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">Todo al día: no hay órdenes pendientes de avance.</p>
        ) : (
          <ul className="relative mt-4 grid gap-2 sm:grid-cols-2">
            {staleOrders.map((order) => (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-white/80 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft" key={order.id}>
                <div className="min-w-0">
                  <Link className="font-semibold text-ink underline decoration-amber-300 underline-offset-4" href={`/ordenes/${order.id}`}>
                    Orden {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {ESTADOS[order.estado as keyof typeof ESTADOS]?.label ?? order.estado} · {order.staleDays} días sin cambio
                  </p>
                </div>
                <Link aria-label={`Revisar orden ${order.id.slice(0, 8)}`} className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-200 bg-white text-amber-900 transition hover:bg-amber-100" href={`/ordenes/${order.id}`}>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }, index) => (
          <article className="admin-reveal group rounded-3xl border border-line bg-white p-5 shadow-[0_12px_35px_-28px_rgba(37,41,39,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-soft" key={label}>
            <div className="flex items-start justify-between">
              <p className="text-sm leading-5 text-muted">{label}</p>
              <span className={`grid size-10 place-items-center rounded-2xl transition duration-300 group-hover:scale-105 ${["bg-sky-50 text-sky-800", "bg-emerald-50 text-emerald-800", "bg-orange-50 text-orange-800", "bg-violet-50 text-violet-800"][index]}`}>
                <Icon aria-hidden="true" size={18} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">{value}</p>
          </article>
        ))}
      </section>
      <DashboardCharts byStatus={byStatus} byMechanic={byMechanic} />
    </main>
  );
}
