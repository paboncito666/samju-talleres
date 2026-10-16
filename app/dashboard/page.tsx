import Link from "next/link";
import { Activity, ClipboardList, Clock3, Wrench } from "lucide-react";
import { DashboardCharts } from "@/app/components/dashboard/charts";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const colors = [
  "#b8c9d9", "#c9bfdc", "#eadcae", "#eac5ad",
  "#a9d1c4", "#c0d49f", "#c9c9ce", "#e1b8bd",
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [ordersResult, mechanicsResult] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, estado, fecha_ingreso, fecha_entrega_real, mecanico_id")
      .order("fecha_ingreso", { ascending: false }),
    supabase.from("profiles").select("id, nombre").eq("rol", "mecanico").eq("activo", true),
  ]);
  if (ordersResult.error) throw new Error(`No se pudieron cargar las órdenes: ${ordersResult.error.message}`);
  if (mechanicsResult.error) throw new Error(`No se pudo cargar el personal: ${mechanicsResult.error.message}`);

  const orders = ordersResult.data;
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.estado));
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
      <RealtimeRefresher tables={["ordenes_trabajo"]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Resumen operativo</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Dashboard</h1><p className="mt-2 text-sm text-muted">Estado general del taller y carga de trabajo.</p></div>
        <Link className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90" href="/ordenes">Ver órdenes</Link>
      </header>
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
