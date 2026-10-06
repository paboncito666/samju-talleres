import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CarFront,
  Check,
  CircleCheck,
  Clock3,
  FileClock,
  Gauge,
  ImageOff,
  Wrench,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("es-MX");

const workTypeLabels: Record<string, string> = {
  mecanico: "Mecánico",
  electrico: "Eléctrico",
  latoneria: "Latonería",
  pintura: "Pintura",
  preventivo: "Preventivo",
  otro: "Otro",
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha registrada";
  return dateFormatter.format(new Date(value));
}

function formatShortDate(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function VehicleHistoryPage({
  params,
}: {
  params: { vehiculoId: string };
}) {
  const supabase = await createSupabaseServerClient();

  const { data: vehiculo, error: vehiculoError } = await supabase
    .from("vehiculos")
    .select(
      "id, placa, marca, modelo, anio, color, kilometraje, propietario_nombre",
    )
    .eq("id", params.vehiculoId)
    .maybeSingle();

  if (vehiculoError) {
    throw new Error(`No se pudo cargar el vehículo: ${vehiculoError.message}`);
  }

  if (!vehiculo) notFound();

  const { data: ordenes, error: ordenesError } = await supabase
    .from("ordenes_trabajo")
    .select(
      `
        id,
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
    .eq("vehiculo_id", vehiculo.id)
    .in("estado", ["ENTREGADO", "CANCELADO"])
    .order("fecha_entrega_real", { ascending: false, nullsFirst: false })
    .order("fecha_ingreso", { ascending: false });

  if (ordenesError) {
    throw new Error(
      `No se pudo cargar el historial del vehículo: ${ordenesError.message}`,
    );
  }

  const trabajos = ordenes.flatMap((orden) => orden.trabajos_realizados ?? []);
  const fotos = ordenes.flatMap((orden) => orden.fotos_vehiculo ?? []);

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
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Volver al inicio
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl bg-ink text-white shadow-soft">
          <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                <FileClock aria-hidden="true" size={15} />
                Historial del vehículo
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {vehiculo.marca} {vehiculo.modelo}
                </h1>
                {vehiculo.anio && (
                  <span className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/75">
                    {vehiculo.anio}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                <span className="inline-flex items-center gap-2">
                  <CarFront aria-hidden="true" size={16} />
                  <span className="font-medium tracking-wide text-white">
                    {vehiculo.placa}
                  </span>
                </span>
                {vehiculo.color && <span>{vehiculo.color}</span>}
                {vehiculo.propietario_nombre && (
                  <span>{vehiculo.propietario_nombre}</span>
                )}
              </div>
            </div>
            {vehiculo.kilometraje !== null && (
              <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 lg:min-w-48">
                <Gauge aria-hidden="true" className="text-white/70" size={20} />
                <div>
                  <p className="text-xs text-white/60">Kilometraje</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {numberFormatter.format(vehiculo.kilometraje)} km
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 border-t border-white/10">
            <div className="px-4 py-4 sm:px-8">
              <p className="text-2xl font-semibold">{ordenes.length}</p>
              <p className="mt-1 text-xs text-white/60 sm:text-sm">
                Órdenes cerradas
              </p>
            </div>
            <div className="border-x border-white/10 px-4 py-4 sm:px-8">
              <p className="text-2xl font-semibold">{trabajos.length}</p>
              <p className="mt-1 text-xs text-white/60 sm:text-sm">
                Trabajos registrados
              </p>
            </div>
            <div className="px-4 py-4 sm:px-8">
              <p className="text-2xl font-semibold">{fotos.length}</p>
              <p className="mt-1 text-xs text-white/60 sm:text-sm">
                Fotos archivadas
              </p>
            </div>
          </div>
        </section>

        <section className="py-9 sm:py-11">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Registro de servicio
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Órdenes cerradas
              </h2>
            </div>
            <p className="text-sm text-muted">
              {ordenes.length === 1
                ? "1 servicio en el historial"
                : `${ordenes.length} servicios en el historial`}
            </p>
          </div>

          {ordenes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-mist text-muted">
                <FileClock aria-hidden="true" size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                Aún no hay servicios cerrados
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                Cuando se entreguen o cancelen órdenes de este vehículo,
                aparecerán aquí junto con sus trabajos y fotografías.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {ordenes.map((orden) => {
                const ordenTrabajos = orden.trabajos_realizados ?? [];
                const ordenFotos = orden.fotos_vehiculo ?? [];
                const entregada = orden.estado === "ENTREGADO";

                return (
                  <article
                    className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
                    key={orden.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          Orden de trabajo
                        </p>
                        <p className="mt-1 font-mono text-sm text-ink">
                          {orden.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          entregada
                            ? "bg-[#edf3ee] text-[#47604e]"
                            : "bg-[#f4efea] text-[#87664c]"
                        }`}
                      >
                        {entregada ? (
                          <CircleCheck aria-hidden="true" size={14} />
                        ) : (
                          <Clock3 aria-hidden="true" size={14} />
                        )}
                        {entregada ? "Entregada" : "Cancelada"}
                      </span>
                    </div>

                    <div className="grid gap-7 px-5 py-6 sm:px-7 lg:grid-cols-[0.85fr_1.15fr]">
                      <div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays aria-hidden="true" size={14} />
                            Ingreso: {formatDate(orden.fecha_ingreso)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Check aria-hidden="true" size={14} />
                            {entregada
                              ? `Cierre: ${formatDate(orden.fecha_entrega_real)}`
                              : "Orden cancelada"}
                          </span>
                        </div>
                        <h3 className="mt-4 text-base font-semibold leading-6 text-ink">
                          {orden.descripcion_trabajo}
                        </h3>
                        <p className="mt-2 text-xs font-medium text-muted">
                          {workTypeLabels[orden.tipo_servicio] ??
                            orden.tipo_servicio}
                        </p>
                        {orden.observaciones && (
                          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted">
                            {orden.observaciones}
                          </p>
                        )}
                        {!entregada && orden.motivo_cancelacion && (
                          <p className="mt-4 rounded-lg bg-[#f7f4f1] px-3 py-2 text-sm leading-6 text-muted">
                            <span className="font-medium text-ink">
                              Motivo de cancelación:{" "}
                            </span>
                            {orden.motivo_cancelacion}
                          </p>
                        )}
                        <Link
                          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-muted"
                          href={`/ordenes/${orden.id}`}
                        >
                          Abrir detalle y notas internas
                          <ArrowRight aria-hidden="true" size={15} />
                        </Link>
                      </div>

                      <div className="space-y-6">
                        <section aria-label="Trabajos realizados">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                              <Wrench
                                aria-hidden="true"
                                className="text-muted"
                                size={16}
                              />
                              Trabajos realizados
                            </h4>
                            <span className="text-xs text-muted">
                              {ordenTrabajos.length}
                            </span>
                          </div>
                          {ordenTrabajos.length === 0 ? (
                            <p className="rounded-lg bg-mist/70 px-3 py-2.5 text-xs text-muted">
                              No se registraron trabajos para esta orden.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {ordenTrabajos.map((trabajo) => (
                                <li
                                  className="flex items-start gap-2.5 rounded-lg bg-mist/70 px-3 py-2.5"
                                  key={trabajo.id}
                                >
                                  <span
                                    className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${
                                      trabajo.completado
                                        ? "bg-[#dce8df] text-[#47604e]"
                                        : "bg-white text-muted"
                                    }`}
                                  >
                                    {trabajo.completado && (
                                      <Check
                                        aria-hidden="true"
                                        size={11}
                                        strokeWidth={2.5}
                                      />
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1 text-sm leading-5 text-ink">
                                    {trabajo.descripcion}
                                    <span className="mt-0.5 block text-xs text-muted">
                                      {workTypeLabels[trabajo.tipo] ??
                                        trabajo.tipo}
                                      {trabajo.creado_en &&
                                        ` · ${formatShortDate(trabajo.creado_en)}`}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>

                        <section aria-label="Fotografías del vehículo">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                              <Camera
                                aria-hidden="true"
                                className="text-muted"
                                size={16}
                              />
                              Fotografías
                            </h4>
                            <span className="text-xs text-muted">
                              {ordenFotos.length}
                            </span>
                          </div>
                          {ordenFotos.length === 0 ? (
                            <p className="rounded-lg bg-mist/70 px-3 py-2.5 text-xs text-muted">
                              Esta orden no tiene fotografías.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {ordenFotos.map((foto) => {
                                const photoUrl = isHttpUrl(foto.url)
                                  ? foto.url
                                  : null;
                                const etapa =
                                  foto.etapa.charAt(0).toUpperCase() +
                                  foto.etapa.slice(1);

                                return (
                                  <figure
                                    className="overflow-hidden rounded-xl border border-line bg-mist"
                                    key={foto.id}
                                  >
                                    {photoUrl ? (
                                      <a
                                        aria-label={`Abrir foto de ${etapa.toLowerCase()}`}
                                        className="relative block aspect-[4/3] overflow-hidden"
                                        href={photoUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        <Image
                                          alt={`Vehículo ${etapa.toLowerCase()}`}
                                          className="object-cover transition duration-300 hover:scale-105"
                                          fill
                                          src={photoUrl}
                                          unoptimized
                                          sizes="(max-width: 640px) 50vw, 200px"
                                        />
                                      </a>
                                    ) : (
                                      <div className="grid aspect-[4/3] place-items-center text-muted">
                                        <ImageOff
                                          aria-hidden="true"
                                          size={22}
                                        />
                                      </div>
                                    )}
                                    <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2 text-[11px] text-muted">
                                      <span>{etapa}</span>
                                      <span>
                                        {formatShortDate(foto.creado_en)}
                                      </span>
                                    </figcaption>
                                  </figure>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="border-t border-line py-5 text-xs text-muted">
          SAMJU Talleres · Historial del vehículo {vehiculo.placa}
        </footer>
      </div>
    </main>
  );
}
