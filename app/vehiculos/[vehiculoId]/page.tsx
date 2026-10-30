import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Gauge, History, UserRound } from "lucide-react";
import { PhotoGallery } from "@/app/components/ordenes/photo-gallery";
import { RealtimeRefresher } from "@/app/components/realtime/realtime-refresher";
import { resolveVehiclePhotoUrls } from "@/lib/storage/photos";
import { ACTIVE_STATUSES, ESTADOS } from "@/lib/estados";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workOrderStatuses } from "@/lib/validations/api";
import { VehicleEditForm } from "@/app/components/vehiculos/vehicle-edit-form";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("es-MX");

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ vehiculoId: string }>;
}) {
  const { vehiculoId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehiculos")
    .select("id, placa, marca, modelo, anio, color, kilometraje, propietario_nombre, propietario_telefono")
    .eq("id", vehiculoId)
    .maybeSingle();
  if (vehicleError) throw new Error(`No se pudo cargar el vehículo: ${vehicleError.message}`);
  if (!vehicle) notFound();

  const { data: orders, error: ordersError } = await supabase
    .from("ordenes_trabajo")
    .select(`
      id,
      estado,
      descripcion_trabajo,
      tipo_servicio,
      fecha_ingreso,
      fecha_estimada_entrega,
      mecanico_id,
      fotos_vehiculo (id, url, etapa, creado_en)
    `)
    .eq("vehiculo_id", vehicle.id)
    .in("estado", [...ACTIVE_STATUSES])
    .order("fecha_ingreso", { ascending: false });
  if (ordersError) throw new Error(`No se pudieron consultar las órdenes activas: ${ordersError.message}`);

  const mechanicIds = Array.from(new Set(orders.map((order) => order.mecanico_id).filter((id): id is string => Boolean(id))));
  const { data: mechanics, error: mechanicsError } = mechanicIds.length
    ? await supabase.from("profiles").select("id, nombre").in("id", mechanicIds)
    : { data: [], error: null };
  if (mechanicsError) throw new Error(`No se pudo cargar el personal asignado: ${mechanicsError.message}`);
  const mechanicNames = new Map(mechanics.map((mechanic) => [mechanic.id, mechanic.nombre]));
  const photoGroups = await Promise.all(
    orders.map((order) => resolveVehiclePhotoUrls(order.fotos_vehiculo ?? [])),
  );
  const photos = photoGroups.flat();

  return (
    <main className="mx-auto max-w-5xl space-y-7">
      <RealtimeRefresher tables={["ordenes_trabajo", "fotos_vehiculo"]} />
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink" href="/vehiculos">
        <ArrowLeft aria-hidden="true" size={16} /> Volver a vehículos
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Detalle del vehículo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{vehicle.marca} {vehicle.modelo} {vehicle.anio ?? ""}</h1>
          <p className="mt-2 font-mono text-sm text-muted">{vehicle.placa}{vehicle.color ? ` · ${vehicle.color}` : ""}</p>
        </div>
        <Link className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" href={`/ordenes/nueva?vehiculoId=${vehicle.id}`}>
          Abrir orden
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-line bg-white p-5"><p className="text-xs text-muted">Kilometraje</p><p className="mt-2 flex items-center gap-2 text-lg font-semibold text-ink"><Gauge size={18} />{numberFormatter.format(vehicle.kilometraje)} km</p></article>
        <article className="rounded-2xl border border-line bg-white p-5"><p className="text-xs text-muted">Propietario</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink"><UserRound size={18} />{vehicle.propietario_nombre || "Sin registrar"}</p>{vehicle.propietario_telefono && <p className="mt-1 text-xs text-muted">{vehicle.propietario_telefono}</p>}</article>
        <article className="rounded-2xl border border-line bg-white p-5"><p className="text-xs text-muted">Órdenes activas</p><p className="mt-2 flex items-center gap-2 text-lg font-semibold text-ink"><ClipboardList size={18} />{orders.length}</p></article>
        <Link className="rounded-2xl border border-line bg-white p-5 transition hover:border-ink/30" href={`/historial/${vehicle.id}`}><p className="text-xs text-muted">Registro de servicio</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink"><History size={18} />Ver historial cerrado</p></Link>
      </section>

      <VehicleEditForm vehicle={vehicle} />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Órdenes activas</h2>
          <p className="mt-1 text-sm text-muted">Estado actual, asignación y fotografías de los servicios en curso.</p>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-7 text-sm text-muted">Este vehículo no tiene órdenes activas.</div>
        ) : orders.map((order) => (
          <article className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft" key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">Orden {order.id.slice(0, 8).toUpperCase()}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{order.descripcion_trabajo}</h3>
                <p className="mt-1 text-sm text-muted">{order.tipo_servicio} · Ingreso {new Date(order.fecha_ingreso).toLocaleDateString("es-MX")}</p>
                <p className="mt-1 text-sm text-muted">{order.mecanico_id ? `Mecánico: ${mechanicNames.get(order.mecanico_id) ?? "Personal asignado"}` : "Sin mecánico asignado"}</p>
              </div>
              {(() => {
                const status = workOrderStatuses.find((candidate) => candidate === order.estado);
                const details = status ? ESTADOS[status] : undefined;
                return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${details?.color ?? "bg-mist text-ink"}`}>{details?.label ?? String(order.estado)}</span>;
              })()}
            </div>
            <Link className="inline-flex rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink" href={`/ordenes/${order.id}`}>Abrir detalle de orden</Link>
          </article>
        ))}
        <PhotoGallery photos={photos} />
      </section>
    </main>
  );
}
