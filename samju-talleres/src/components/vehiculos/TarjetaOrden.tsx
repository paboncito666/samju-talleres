import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { OrdenConRelaciones } from "@/types";
import { Badge, Card, CardContent } from "@/components/ui";

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatearFecha(value: string | null): string {
  if (!value) {
    return "Sin fecha";
  }
  return fecha.format(new Date(value));
}

export interface TarjetaOrdenProps {
  orden: OrdenConRelaciones;
}

export function TarjetaOrden({ orden }: TarjetaOrdenProps) {
  return (
    <Card className="transition-colors hover:border-gris-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/ordenes/${orden.id}`}
              className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
            >
              {orden.vehiculo.placa}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">Ver orden de {orden.vehiculo.placa}</span>
            </Link>
            <p className="mt-1 text-sm text-muted">
              {orden.vehiculo.marca} {orden.vehiculo.modelo}{" "}
              <span aria-label="año">· {orden.vehiculo.anio}</span>
            </p>
          </div>
          <Badge estado={orden.estado} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted">Propietario</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {orden.vehiculo.propietario_nombre}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Mecánico</dt>
            <dd className="mt-0.5 text-foreground">
              {orden.mecanico?.nombre ?? "Sin asignar"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ingreso</dt>
            <dd className="mt-0.5 text-foreground">
              {formatearFecha(orden.fecha_ingreso)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted">Entrega estimada</dt>
            <dd className="mt-0.5 text-foreground">
              {formatearFecha(orden.fecha_estimada_entrega)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
