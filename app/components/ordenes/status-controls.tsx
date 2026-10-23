"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  workOrderStatuses,
  workOrderStatusTransitions,
  type WorkOrderStatus,
} from "@/lib/validations/api";
import { ESTADOS } from "@/lib/estados";

export function StatusControls({
  orderId,
  currentStatus,
  initialDiagnosis,
  hasExitPhoto,
}: {
  orderId: string;
  currentStatus: WorkOrderStatus;
  initialDiagnosis: string;
  hasExitPhoto: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<WorkOrderStatus>(
    workOrderStatusTransitions[currentStatus][0] ?? currentStatus,
  );
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = workOrderStatusTransitions[currentStatus];
  const needsDiagnosis = ["CALIDAD", "LISTO", "ENTREGADO"].includes(status);
  const needsExitPhoto = status === "ENTREGADO" && !hasExitPhoto;

  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/ordenes/${orderId}/estado`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          estado: status,
          diagnostico: diagnosis,
          motivo: reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar la orden.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold text-ink">Seguimiento de la orden</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-muted">
          Próximo estado
          <select className="mt-1.5 block w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" value={status} onChange={(event) => setStatus(event.target.value as WorkOrderStatus)}>
            <option value={currentStatus}>{ESTADOS[currentStatus].label} (actual)</option>
            {options.map((value) => <option key={value} value={value}>{ESTADOS[value].label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-muted md:col-span-2">
          Diagnóstico técnico
          <textarea className="mt-1.5 block min-h-24 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" maxLength={10000} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Describe la causa y el resultado de la revisión" />
        </label>
        {status === "CANCELADO" && <label className="text-xs font-medium text-muted md:col-span-2">Motivo de cancelación<textarea className="mt-1.5 block w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>}
      </div>
      {needsDiagnosis && !diagnosis.trim() && <p className="mt-3 text-xs text-muted">El diagnóstico es obligatorio antes de control de calidad o cierre.</p>}
      {needsExitPhoto && <p className="mt-3 text-xs text-muted">Sube al menos una fotografía de salida en la sección de fotografías antes de entregar el vehículo.</p>}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <button className="mt-4 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy || !options.length || status === currentStatus || (needsDiagnosis && !diagnosis.trim()) || needsExitPhoto || (status === "CANCELADO" && !reason.trim())} onClick={save} type="button">
        {busy ? "Guardando..." : "Actualizar orden"}
      </button>
      {workOrderStatuses.includes(currentStatus) && !options.length && <p className="mt-3 text-xs text-muted">La orden está en un estado final.</p>}
    </section>
  );
}
