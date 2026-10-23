"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { workOrderCreateSchema } from "@/lib/validations/api";

type VehicleOption = { id: string; placa: string; marca: string; modelo: string };
type MechanicOption = { id: string; nombre: string };

export function WorkOrderForm({
  vehicles,
  mechanics,
  initialVehicleId,
}: {
  vehicles: VehicleOption[];
  mechanics: MechanicOption[];
  initialVehicleId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = workOrderCreateSchema.safeParse({
      vehiculo_id: values.vehiculo_id,
      mecanico_id: values.mecanico_id || null,
      descripcion_trabajo: values.descripcion_trabajo,
      tipo_servicio: values.tipo_servicio,
      fecha_estimada_entrega: values.fecha_estimada_entrega || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos de la orden.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo abrir la orden.");
      router.push(`/ordenes/${result.data.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
      <label className="block text-sm font-medium text-ink">
        Vehículo *
        <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="vehiculo_id" defaultValue={initialVehicleId} required>
          <option value="" disabled>Selecciona un vehículo</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.placa} · {vehicle.marca} {vehicle.modelo}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-ink">
        Mecánico asignado
        <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="mecanico_id" defaultValue="">
          <option value="">Sin asignar</option>
          {mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.nombre}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-ink">
        Tipo de servicio *
        <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="tipo_servicio" defaultValue="mecanico" required>
          <option value="mecanico">Mecánico</option>
          <option value="electrico">Eléctrico</option>
          <option value="latoneria">Latonería</option>
          <option value="pintura">Pintura</option>
          <option value="preventivo">Preventivo</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-ink">
        Motivo de ingreso *
        <textarea className="mt-1.5 min-h-28 w-full rounded-lg border border-line px-3 py-2.5" name="descripcion_trabajo" maxLength={10000} required />
      </label>
      <label className="block text-sm font-medium text-ink">
        Fecha estimada de entrega
        <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="fecha_estimada_entrega" type="date" />
      </label>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy} type="submit">
          {busy ? "Abriendo orden..." : "Abrir orden"}
        </button>
        <Link className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink" href="/ordenes">Cancelar</Link>
      </div>
    </form>
  );
}
