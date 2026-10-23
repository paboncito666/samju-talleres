"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vehicleCreateSchema } from "@/lib/validations/api";

export function VehicleRegistrationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const parsed = vehicleCreateSchema.safeParse({
      placa: formData.get("placa"),
      marca: formData.get("marca"),
      modelo: formData.get("modelo"),
      anio: Number(formData.get("anio")),
      color: formData.get("color") || "",
      kilometraje: Number(formData.get("kilometraje") || 0),
      propietario_nombre: formData.get("propietario_nombre") || "",
      propietario_telefono: formData.get("propietario_telefono") || "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos del vehículo.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar el vehículo.");
      router.push(`/ordenes/nueva?vehiculoId=${encodeURIComponent(result.data.id)}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Placa *
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 uppercase" name="placa" required maxLength={10} />
        </label>
        <label className="text-sm font-medium text-ink">
          Marca *
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="marca" required maxLength={100} />
        </label>
        <label className="text-sm font-medium text-ink">
          Modelo *
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="modelo" required maxLength={100} />
        </label>
        <label className="text-sm font-medium text-ink">
          Año *
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="anio" type="number" min="1900" max={new Date().getFullYear() + 1} required />
        </label>
        <label className="text-sm font-medium text-ink">
          Color
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="color" maxLength={60} />
        </label>
        <label className="text-sm font-medium text-ink">
          Kilometraje
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="kilometraje" type="number" min="0" step="1" defaultValue="0" />
        </label>
        <label className="text-sm font-medium text-ink">
          Nombre del propietario
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="propietario_nombre" maxLength={160} />
        </label>
        <label className="text-sm font-medium text-ink">
          Teléfono de contacto
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="propietario_telefono" type="tel" maxLength={40} />
        </label>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy} type="submit">
          {busy ? "Guardando..." : "Guardar y abrir orden"}
        </button>
        <Link className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink" href="/vehiculos">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
