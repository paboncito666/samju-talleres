import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, CarFront, CircleUserRound, Gauge } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { CambiarEstadoModal } from "@/components/ordenes/CambiarEstadoModal";
import { ExportarPdf } from "@/components/ordenes/ExportarPdf";
import { HistorialEstados } from "@/components/ordenes/HistorialEstados";
import { NotasInternas } from "@/components/ordenes/NotasInternas";
import { TimelineEstados } from "@/components/ordenes/TimelineEstados";
import { getOrdenById } from "@/lib/data/ordenes";

interface OrdenDetallePageProps {
  params: Promise<{ id: string }>;
}

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function fecha(value: string | null): string {
  return value ? formatoFecha.format(new Date(value)) : "No registrada";
}

export default async function OrdenDetallePage({
  params,
}: OrdenDetallePageProps) {
  const { id } = await params;
  const orden = await getOrdenById(id);

  if (!orden) {
    notFound();
  }

  const totalRepuestos = orden.repuestos_orden.reduce(
    (total, repuesto) => total + repuesto.cantidad * repuesto.costo_unitario,
    0,
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">Orden de trabajo</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {orden.vehiculo.placa}
            </h1>
            <Badge estado={orden.estado} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {orden.vehiculo.marca} {orden.vehiculo.modelo}{" "}
            {orden.vehiculo.anio} · {orden.vehiculo.color ?? "Color no registrado"}
          </p>
        </div>
        <CambiarEstadoModal
          ordenId={orden.id}
          estadoActual={orden.estado}
          puedeCambiarEstado
        />
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <TimelineEstados
            estado={orden.estado}
            motivoCancelacion={orden.motivo_cancelacion}
            estadoPrevioCancelacion={orden.estadoPrevioCancelacion}
          />

          <Card>
            <CardHeader>
              <CardTitle>Descripción del trabajo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {orden.descripcion_trabajo}
              </p>
              {orden.observaciones && (
                <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm leading-6 text-muted">
                  <span className="font-medium text-foreground">Observaciones:</span>{" "}
                  {orden.observaciones}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trabajos realizados</CardTitle>
              <CardDescription>
                Lista de tareas asociadas a esta orden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orden.trabajos_realizados.length > 0 ? (
                <ul className="space-y-3">
                  {orden.trabajos_realizados.map((trabajo) => (
                    <li
                      key={trabajo.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={trabajo.completado}
                        readOnly
                        aria-label={`${trabajo.descripcion}: ${trabajo.completado ? "completado" : "pendiente"}`}
                        className="mt-0.5 size-4 rounded border-line accent-ink"
                      />
                      <span
                        className={
                          trabajo.completado
                            ? "text-muted line-through"
                            : "text-foreground"
                        }
                      >
                        {trabajo.descripcion}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Aún no hay trabajos registrados.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repuestos</CardTitle>
              <CardDescription>
                Repuestos asociados a la orden y sus costos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orden.repuestos_orden.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-line text-xs text-muted">
                      <tr>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Repuesto
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Cantidad
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Costo unitario
                        </th>
                        <th scope="col" className="py-2 pl-3 text-right font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {orden.repuestos_orden.map((repuesto) => (
                        <tr key={repuesto.id}>
                          <td className="py-3 pr-3 text-foreground">
                            {repuesto.nombre_repuesto}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {repuesto.cantidad}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {formatoCOP.format(repuesto.costo_unitario)}
                          </td>
                          <td className="py-3 pl-3 text-right font-medium text-foreground">
                            {formatoCOP.format(
                              repuesto.cantidad * repuesto.costo_unitario,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th
                          scope="row"
                          colSpan={3}
                          className="pt-3 text-right font-semibold text-foreground"
                        >
                          Total de repuestos
                        </th>
                        <td className="pt-3 pl-3 text-right font-semibold text-ink">
                          {formatoCOP.format(totalRepuestos)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No se han asociado repuestos a esta orden.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Galería de fotos</CardTitle>
              <CardDescription>Próximamente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                La galería de fotos del vehículo se implementará próximamente.
              </p>
            </CardContent>
          </Card>

          <NotasInternas ordenId={orden.id} />
          <HistorialEstados ordenId={orden.id} />
          <ExportarPdf ordenId={orden.id} />
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Información del vehículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dato
                icono={<CarFront aria-hidden="true" className="size-4" />}
                etiqueta="Vehículo"
                valor={`${orden.vehiculo.marca} ${orden.vehiculo.modelo} ${orden.vehiculo.anio}`}
              />
              <Dato
                icono={<Gauge aria-hidden="true" className="size-4" />}
                etiqueta="Kilometraje"
                valor={`${orden.vehiculo.kilometraje.toLocaleString("es-CO")} km`}
              />
              <Dato
                icono={<CircleUserRound aria-hidden="true" className="size-4" />}
                etiqueta="Propietario"
                valor={orden.vehiculo.propietario_nombre}
                detalle={orden.vehiculo.propietario_telefono ?? undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsables y fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dato
                etiqueta="Mecánico"
                valor={orden.mecanico?.nombre ?? "Sin asignar"}
              />
              <Dato
                etiqueta="Recepcionista"
                valor={orden.recepcionista?.nombre ?? "Sin asignar"}
              />
              <div className="border-t border-line pt-4">
                <Dato
                  icono={<CalendarDays aria-hidden="true" className="size-4" />}
                  etiqueta="Fecha de ingreso"
                  valor={fecha(orden.fecha_ingreso)}
                />
              </div>
              <Dato
                icono={<CalendarDays aria-hidden="true" className="size-4" />}
                etiqueta="Entrega estimada"
                valor={fecha(orden.fecha_estimada_entrega)}
              />
              <Dato
                icono={<CalendarDays aria-hidden="true" className="size-4" />}
                etiqueta="Entrega real"
                valor={fecha(orden.fecha_entrega_real)}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

interface DatoProps {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono?: ReactNode;
}

function Dato({ etiqueta, valor, detalle, icono }: DatoProps) {
  return (
    <div className="flex items-start gap-2.5">
      {icono && <span className="mt-0.5 text-muted">{icono}</span>}
      <div className="min-w-0">
        <p className="text-xs text-muted">{etiqueta}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-foreground">
          {valor}
        </p>
        {detalle && <p className="mt-0.5 text-xs text-muted">{detalle}</p>}
      </div>
    </div>
  );
}
