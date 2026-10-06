import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { FiltrosVehiculos } from "@/components/vehiculos/FiltrosVehiculos";
import { PaginacionVehiculos } from "@/components/vehiculos/PaginacionVehiculos";
import { TablaOrdenes } from "@/components/vehiculos/TablaOrdenes";
import { RealtimeRefresher } from "@/components/realtime/RealtimeRefresher";
import { ESTADOS, type EstadoOrden } from "@/lib/estados";
import { getMecanicos, getOrdenes } from "@/lib/data/ordenes";

interface VehiculosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parametro(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function numeroPositivo(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) {
    return fallback;
  }
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function esEstadoOrden(value: string | undefined): value is EstadoOrden {
  return Boolean(value && Object.hasOwn(ESTADOS, value));
}

export default async function VehiculosPage({
  searchParams,
}: VehiculosPageProps) {
  const params = await searchParams;
  const estadoParam = parametro(params, "estado");
  const estadoInvalido = Boolean(estadoParam && !esEstadoOrden(estadoParam));
  const page = numeroPositivo(parametro(params, "page"), 1);
  const pageSize = 10;
  const filtros = {
    estado: esEstadoOrden(estadoParam) ? estadoParam : undefined,
    mecanicoId: parametro(params, "mecanicoId"),
    desde: parametro(params, "desde"),
    hasta: parametro(params, "hasta"),
    q: parametro(params, "q"),
    page,
    pageSize,
  };

  const [ordenesResultado, mecanicosResultado] = await Promise.all([
    getOrdenes(filtros),
    getMecanicos(),
  ]);
  const error =
    (estadoInvalido ? new Error("El estado seleccionado no es válido.") : null) ??
    ordenesResultado.error ??
    mecanicosResultado.error;
  const parametros = Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Órdenes y vehículos
          </h1>
          <p className="mt-1 text-sm text-muted">
            Busca y filtra las órdenes de trabajo del taller.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeRefresher tables={[{ table: "ordenes_trabajo" }]} />
          <Button
            disabled
            title="La creación de órdenes se conectará próximamente"
            iconLeft={<Plus aria-hidden="true" size={16} />}
          >
            Nueva orden
          </Button>
        </div>
      </header>

      <FiltrosVehiculos
        key={parametro(params, "q") ?? ""}
        mecanicos={mecanicosResultado.data ?? []}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-foreground/25 bg-rose px-4 py-3 text-sm text-rose-foreground"
        >
          <p className="font-semibold">No se pudieron cargar las órdenes.</p>
          <p className="mt-1">{error.message}</p>
        </div>
      ) : ordenesResultado.data.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="No encontramos órdenes que coincidan con los filtros seleccionados."
          action={
            <Link
              href="/vehiculos"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Limpiar filtros
            </Link>
          }
        />
      ) : (
        <>
          <TablaOrdenes ordenes={ordenesResultado.data} />
          <PaginacionVehiculos
            parametros={parametros}
            page={page}
            pageSize={pageSize}
            total={ordenesResultado.total}
          />
        </>
      )}
    </main>
  );
}
