import Link from "next/link";
import { Archive, ArrowUpRight, CarFront, Search } from "lucide-react";
import { PageHero, PageHeroStat } from "@/app/components/ui/page-hero";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HistorySearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const filters = await searchParams;
  const queryText = filters.q?.trim().slice(0, 80).replace(/[%_,]/g, "") ?? "";
  let query = (await createSupabaseServerClient())
    .from("vehiculos")
    .select("id, placa, marca, modelo, anio, color, propietario_nombre", { count: "exact" })
    .order("placa")
    .limit(300);
  if (queryText) {
    query = query.or(`placa.ilike.%${queryText}%,propietario_nombre.ilike.%${queryText}%`);
  }
  const { data: vehicles, count, error } = await query;
  if (error) throw new Error(`No se pudieron consultar los vehículos para el historial: ${error.message}`);

  return (
    <main className="admin-stagger space-y-7">
      <PageHero
        description="Elige un vehículo para consultar sus órdenes cerradas, los trabajos realizados y las fotografías archivadas."
        eyebrow="Registro de servicio"
        icon={Archive}
        title="Historial por vehículo"
      >
        <PageHeroStat icon={CarFront} label="Vehículos encontrados" value={count ?? vehicles.length} />
        <PageHeroStat icon={Archive} label="Acceso al historial" value="Por vehículo" />
        <PageHeroStat icon={Search} label="Búsqueda" value="Placa o dueño" />
      </PageHero>

      <form className="admin-reveal rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-5" method="get">
        <label className="block text-sm font-semibold text-ink" htmlFor="vehicle-history-search">
          Busca el vehículo
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="min-w-0 rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-900/10"
            defaultValue={filters.q}
            id="vehicle-history-search"
            maxLength={80}
            name="q"
            placeholder="Placa o nombre del propietario"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" type="submit">
            <Search className="size-4" aria-hidden="true" />
            Buscar vehículo
          </button>
        </div>
      </form>

      {vehicles.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
          No encontramos vehículos con esa búsqueda.
        </p>
      ) : (
        <section aria-label="Vehículos con historial" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle, index) => (
            <Link
              className="admin-reveal group rounded-3xl border border-line bg-white p-5 shadow-[0_12px_35px_-28px_rgba(37,41,39,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              href={`/historial/${vehicle.id}`}
              key={vehicle.id}
              style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-mist text-ink transition duration-300 group-hover:scale-105">
                  <CarFront className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight className="size-4 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                {vehicle.marca} {vehicle.modelo} {vehicle.anio ?? ""}
              </h2>
              <p className="mt-1 inline-flex rounded-lg bg-background px-2.5 py-1 text-xs font-semibold tracking-wide text-ink">
                {vehicle.placa}{vehicle.color ? ` · ${vehicle.color}` : ""}
              </p>
              <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
                Propietario: <span className="font-medium text-ink">{vehicle.propietario_nombre || "Sin registrar"}</span>
              </p>
              <span className="mt-4 block text-sm font-semibold text-emerald-900">Abrir historial de este vehículo</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
