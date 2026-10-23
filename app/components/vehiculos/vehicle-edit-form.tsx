"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { vehicleUpdateSchema } from "@/lib/validations/api";

export interface EditableVehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  kilometraje: number;
  propietario_nombre: string | null;
  propietario_telefono: string | null;
}

export function VehicleEditForm({ vehicle }: { vehicle: EditableVehicle }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = vehicleUpdateSchema.safeParse({
      placa: values.placa,
      marca: values.marca,
      modelo: values.modelo,
      anio: Number(values.anio),
      color: values.color || "",
      kilometraje: Number(values.kilometraje),
      propietario_nombre: values.propietario_nombre || "",
      propietario_telefono: values.propietario_telefono || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del vehículo.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/vehiculos/${vehicle.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar el vehículo.");
      setNotice("Los datos del vehículo se actualizaron.");
      setEditing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Datos del vehículo</h2>
        {!editing && (
          <button
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink"
            onClick={() => { setError(""); setNotice(""); setEditing(true); }}
            type="button"
          >
            Editar datos
          </button>
        )}
      </div>
      {notice && <p className="mt-3 text-sm text-sage-foreground" role="status">{notice}</p>}
      {editing && (
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">Placa
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 uppercase" defaultValue={vehicle.placa} maxLength={10} name="placa" required />
            </label>
            <label className="text-sm font-medium text-ink">Marca
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.marca} maxLength={100} name="marca" required />
            </label>
            <label className="text-sm font-medium text-ink">Modelo
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.modelo} maxLength={100} name="modelo" required />
            </label>
            <label className="text-sm font-medium text-ink">Año
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.anio ?? ""} max={new Date().getFullYear() + 1} min="1900" name="anio" required type="number" />
            </label>
            <label className="text-sm font-medium text-ink">Color
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.color ?? ""} maxLength={60} name="color" />
            </label>
            <label className="text-sm font-medium text-ink">Kilometraje
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.kilometraje} min="0" name="kilometraje" required type="number" />
            </label>
            <label className="text-sm font-medium text-ink">Propietario
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.propietario_nombre ?? ""} maxLength={160} name="propietario_nombre" />
            </label>
            <label className="text-sm font-medium text-ink">Teléfono de contacto
              <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue={vehicle.propietario_telefono ?? ""} maxLength={40} name="propietario_telefono" type="tel" />
            </label>
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy} type="submit">
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
            <button className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink" disabled={busy} onClick={() => setEditing(false)} type="button">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
