import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { OrdenConRelaciones } from "@/types";
import { Badge } from "@/components/ui";
import { TarjetaOrden } from "@/components/vehiculos/TarjetaOrden";

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatearFecha(value: string | null): string {
  return value ? fecha.format(new Date(value)) : "—";
}

export interface TablaOrdenesProps {
  ordenes: OrdenConRelaciones[];
}

export function TablaOrdenes({ ordenes }: TablaOrdenesProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-sm md:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs font-medium uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Placa</th>
              <th scope="col" className="px-4 py-3">Vehículo</th>
              <th scope="col" className="px-4 py-3">Propietario</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Mecánico</th>
              <th scope="col" className="px-4 py-3">Ingreso</th>
              <th scope="col" className="px-4 py-3">Entrega estimada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ordenes.map((orden) => (
              <tr key={orden.id} className="transition-colors hover:bg-gris-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium">
                  <Link
                    href={`/ordenes/${orden.id}`}
                    className="inline-flex items-center gap-1 text-ink hover:underline"
                  >
                    {orden.vehiculo.placa}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    <span className="sr-only">
                      Ver orden de {orden.vehiculo.placa}
                    </span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {orden.vehiculo.marca} {orden.vehiculo.modelo}{" "}
                  {orden.vehiculo.anio}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {orden.vehiculo.propietario_nombre}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge estado={orden.estado} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {orden.mecanico?.nombre ?? "Sin asignar"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {formatearFecha(orden.fecha_ingreso)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {formatearFecha(orden.fecha_estimada_entrega)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {ordenes.map((orden) => (
          <TarjetaOrden key={orden.id} orden={orden} />
        ))}
      </div>
    </>
  );
}
