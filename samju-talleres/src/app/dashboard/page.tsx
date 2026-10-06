import {
  Activity,
  ClipboardList,
  Clock3,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { CargaMecanicosChart } from "@/components/dashboard/CargaMecanicosChart";
import { OrdenesPorEstadoChart } from "@/components/dashboard/OrdenesPorEstadoChart";
import { TiempoReparacionChart } from "@/components/dashboard/TiempoReparacionChart";
import {
  getCargaMecanicos,
  getOrdenesPorEstado,
  getResumenDashboard,
} from "@/lib/data/ordenes";

const kpis = [
  {
    clave: "ordenesActivas",
    titulo: "Órdenes activas",
    icono: ClipboardList,
    sufijo: "",
    descripcion: "Órdenes en curso",
  },
  {
    clave: "listasParaEntrega",
    titulo: "Listas para entrega",
    icono: Activity,
    sufijo: "",
    descripcion: "Esperando al propietario",
  },
  {
    clave: "promedioDiasReparacion",
    titulo: "Promedio de reparación",
    icono: Clock3,
    sufijo: " días",
    descripcion: "En órdenes entregadas",
  },
  {
    clave: "ordenesEnReparacion",
    titulo: "En reparación",
    icono: Wrench,
    sufijo: "",
    descripcion: "Trabajo en curso",
  },
] as const;

export default async function DashboardPage() {
  const [ordenesResultado, cargaResultado, resumenResultado] =
    await Promise.all([
      getOrdenesPorEstado(),
      getCargaMecanicos(),
      getResumenDashboard(),
    ]);

  if (ordenesResultado.error) {
    throw ordenesResultado.error;
  }
  if (cargaResultado.error) {
    throw cargaResultado.error;
  }
  if (resumenResultado.error) {
    throw resumenResultado.error;
  }

  const resumen = resumenResultado.data;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Resumen general de la operación del taller.
        </p>
      </header>

      <section
        aria-label="Indicadores principales"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map(({ clave, titulo, icono: Icon, sufijo, descripcion }) => (
          <Card key={clave}>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardDescription>{titulo}</CardDescription>
                <CardTitle className="text-2xl">
                  {resumen[clave]}
                  {sufijo}
                </CardTitle>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-surface-muted text-muted">
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted">{descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        aria-label="Gráficos del taller"
        className="grid gap-5 xl:grid-cols-2"
      >
        <OrdenesPorEstadoChart datos={ordenesResultado.data} />
        <CargaMecanicosChart datos={cargaResultado.data} />
        <div className="xl:col-span-2">
          <TiempoReparacionChart datos={cargaResultado.data} />
        </div>
      </section>
    </main>
  );
}
