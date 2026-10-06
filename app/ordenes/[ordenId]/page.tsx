import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  ClipboardList,
  FileClock,
  Gauge,
  UserRound,
  Wrench,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PdfExportButton } from "@/app/components/pdf-export-button";
import { InternalNotes } from "./internal-notes";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const workTypeLabels: Record<string, string> = {
  mecanico: "Mecánico",
  electrico: "Eléctrico",
  latoneria: "Latonería",
  pintura: "Pintura",
  preventivo: "Preventivo",
  otro: "Otro",
};

const statusLabels: Record<string, string> = {
  RECIBIDO: "Recibido",
  DIAGNOSTICO: "Diagnóstico",
  PENDIENTE: "Pendiente",
  REPARACION: "En reparación",
  CALIDAD: "Control de calidad",
  LISTO: "Listo para entregar",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Pendiente";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { ordenId: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: orden, error: ordenError } = await supabase
    .from("ordenes_trabajo")
    .select(
      `
        id,
        vehiculo_id,
        mecanico_id,
        recepcionista_id,
        estado,
        descripcion_trabajo,
        tipo_servicio,
        fecha_ingreso,
        fecha_estimada_entrega,
        fecha_entrega_real,
        observaciones,
        motivo_cancelacion,
        trabajos_realizados (
          id,
          descripcion,
          tipo,
          completado,
          creado_en
        ),
        fotos_vehiculo (
          id,
          url,
          etapa,
          creado_en
        )
      `,
    )
    .eq("id", params.ordenId)
    .maybeSingle();

  if (ordenError) {
    throw new Error(`No se pudo cargar la orden: ${ordenError.message}`);
  }

  if (!orden) notFound();

  const profileIds = [orden.mecanico_id, orden.recepcionista_id].filter(
    (id): id is string => Boolean(id),
  );
  const [vehicleResult, notesResult, profilesResult] = await Promise.all([
    supabase
      .from("vehiculos")
      .select("id, placa, marca, modelo, anio, color, kilometraje")
      .eq("id", orden.vehiculo_id)
      .maybeSingle(),
    supabase
      .from("notas_internas")
      .select("id, orden_id, autor_id, contenido, creado_en")
      .eq("orden_id", orden.id)
      .order("creado_en", { ascending: false }),
    profileIds.length
      ? supabase.from("profiles").select("id, nombre").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (vehicleResult.error) {
    throw new Error(
      `No se pudo cargar el vehículo de la orden: ${vehicleResult.error.message}`,
    );
  }
  if (notesResult.error) {
    throw new Error(
      `No se pudieron cargar las notas internas: ${notesResult.error.message}`,
    );
  }
  if (profilesResult.error) {
    throw new Error(
      `No se pudo cargar el personal asignado: ${profilesResult.error.message}`,
    );
  }
  if (!vehicleResult.data) notFound();

  const profileNames = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.nombre]),
  );
  const mechanic = orden.mecanico_id
    ? profileNames.get(orden.mecanico_id) ?? "Perfil no disponible"
    : "Sin asignar";
  const receptionist = orden.recepcionista_id
    ? profileNames.get(orden.recepcionista_id) ?? "Perfil no disponible"
    : "Sin asignar";
  const pdfDateFormatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const safePlate = vehicleResult.data.placa.replace(/[^a-zA-Z0-9-]/g, "-");

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <Link
            aria-label="SAMJU Talleres, inicio"
            className="flex items-center gap-3"
            href="/"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
              <Wrench aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.12em] text-ink">
                SAMJU
              </span>
              <span className="block text-xs text-muted">Talleres</span>
            </span>
          </Link>
          <span className="hidden rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted sm:inline-flex">
            Plataforma interna
          </span>
        </header>

        <div className="py-7">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink"
            href={`/historial/${orden.vehiculo_id}`}
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Volver al historial del vehículo
          </Link>
        </div>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                <ClipboardList aria-hidden="true" size={15} />
                Detalle de orden
              </p>
              <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">
                {orden.id.slice(0, 8).toUpperCase()}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink">
                {statusLabels[orden.estado] ?? orden.estado}
              </span>
              <PdfExportButton
                label="Exportar resumen PDF"
                report={{
                  kind: "order",
                  fileName: `orden-${safePlate}-${orden.id
                    .slice(0, 8)
                    .toLowerCase()}.pdf`,
                  vehicle: {
                    make: vehicleResult.data.marca,
                    model: vehicleResult.data.modelo,
                    plate: vehicleResult.data.placa,
                    year: vehicleResult.data.anio?.toString() ?? "",
                    color: vehicleResult.data.color ?? "",
                    mileage:
                      vehicleResult.data.kilometraje === null
                        ? ""
                        : `${new Intl.NumberFormat("es-MX").format(
                            vehicleResult.data.kilometraje,
                          )} km`,
                  },
                  order: {
                    number: orden.id.toUpperCase(),
                    status: statusLabels[orden.estado] ?? orden.estado,
                    description: orden.descripcion_trabajo,
                    serviceType:
                      workTypeLabels[orden.tipo_servicio] ??
                      orden.tipo_servicio,
                    entryDate: pdfDateFormatter.format(
                      new Date(orden.fecha_ingreso),
                    ),
                    estimatedDate: formatDate(orden.fecha_estimada_entrega),
                    closingDate: orden.fecha_entrega_real
                      ? pdfDateFormatter.format(
                          new Date(orden.fecha_entrega_real),
                        )
                      : "",
                    mechanic,
                    receptionist,
                    observations: orden.observaciones ?? "",
                    cancellationReason: orden.motivo_cancelacion ?? "",
                    works: (orden.trabajos_realizados ?? []).map(
                      (trabajo) => ({
                        description: trabajo.descripcion,
                        type:
                          workTypeLabels[trabajo.tipo] ?? trabajo.tipo,
                        completed: trabajo.completado,
                        date: pdfDateFormatter.format(
                          new Date(trabajo.creado_en),
                        ),
                      }),
                    ),
                    photos: (orden.fotos_vehiculo ?? []).map((foto) => ({
                      stage: foto.etapa,
                      date: pdfDateFormatter.format(new Date(foto.creado_en)),
                      url: isHttpUrl(foto.url) ? foto.url : null,
                    })),
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-7 grid gap-6 border-t border-line pt-6 md:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Vehículo
              </h2>
              <Link
                className="mt-3 inline-flex items-center gap-3 rounded-xl bg-mist/70 px-4 py-3 transition hover:bg-mist"
                href={`/historial/${vehicleResult.data.id}`}
              >
                <CarFront aria-hidden="true" className="text-muted" size={20} />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {vehicleResult.data.marca} {vehicleResult.data.modelo}
                    {vehicleResult.data.anio
                      ? ` · ${vehicleResult.data.anio}`
                      : ""}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {vehicleResult.data.placa}
                    {vehicleResult.data.color
                      ? ` · ${vehicleResult.data.color}`
                      : ""}
                  </span>
                </span>
              </Link>
              {vehicleResult.data.kilometraje !== null && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <Gauge aria-hidden="true" size={14} />
                  {new Intl.NumberFormat("es-MX").format(
                    vehicleResult.data.kilometraje,
                  )}{" "}
                  km
                </p>
              )}
            </div>

            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Servicio solicitado
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink">
                {orden.descripcion_trabajo}
              </p>
              <p className="mt-1 text-xs text-muted">
                {workTypeLabels[orden.tipo_servicio] ?? orden.tipo_servicio}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">Fecha de ingreso</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-ink">
                  <CalendarDays
                    aria-hidden="true"
                    className="text-muted"
                    size={15}
                  />
                  {formatDate(orden.fecha_ingreso)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Entrega estimada</p>
                <p className="mt-1 text-sm text-ink">
                  {formatDate(orden.fecha_estimada_entrega)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Personal asignado
              </p>
              <div className="mt-2 space-y-1.5 text-sm text-ink">
                <p className="flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="text-muted"
                    size={15}
                  />
                  Mecánico:{" "}
                  {mechanic}
                </p>
                <p className="flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="text-muted"
                    size={15}
                  />
                  Recepcionista:{" "}
                  {receptionist}
                </p>
              </div>
            </div>

            {orden.observaciones && (
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Observaciones de la orden
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
                  {orden.observaciones}
                </p>
              </div>
            )}

            {orden.motivo_cancelacion && (
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Motivo de cancelación
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
                  {orden.motivo_cancelacion}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Comunicación del equipo
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Notas internas
            </h2>
            <p className="mt-1 text-sm text-muted">
              Actualizaciones visibles para el personal del taller.
            </p>
          </div>
          <InternalNotes
            initialNotes={(notesResult.data ?? []).map((note) => ({
              ...note,
              autor_nombre: note.autor_id
                ? profileNames.get(note.autor_id) ?? "Personal del taller"
                : "Personal del taller",
            }))}
            orderId={orden.id}
          />
        </section>

        <footer className="flex items-center gap-2 border-t border-line py-5 text-xs text-muted">
          <FileClock aria-hidden="true" size={14} />
          Ingreso de la orden:{" "}
          {dateTimeFormatter.format(new Date(orden.fecha_ingreso))}
        </footer>
      </div>
    </main>
  );
}
