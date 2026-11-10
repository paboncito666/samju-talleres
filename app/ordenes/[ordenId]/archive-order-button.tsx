"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Archive, ShieldAlert, X } from "lucide-react";

export function ArchiveOrderButton({
  orderId,
  vehicleId,
}: {
  orderId: string;
  vehicleId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) setIsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy]);

  async function archiveOrder() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/ordenes/${orderId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo archivar la orden.");
      router.push(`/historial/${vehicleId}?archivada=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-3.5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        onClick={() => {
          setError("");
          setConfirmation("");
          setIsOpen(true);
        }}
        type="button"
      >
        <Archive aria-hidden="true" className="size-4" />
        Archivar orden
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
          <section
            aria-describedby="archive-order-description"
            aria-labelledby="archive-order-title"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-line bg-white p-5 shadow-2xl sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-900">
                <ShieldAlert aria-hidden="true" className="size-5" />
              </span>
              <button
                aria-label="Cerrar confirmación"
                className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-mist hover:text-ink"
                disabled={busy}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink" id="archive-order-title">
              Archivar orden
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted" id="archive-order-description">
              La orden <strong className="font-mono text-ink">{orderId.slice(0, 8).toUpperCase()}</strong> dejará
              de aparecer entre las órdenes activas. Se conservará en el historial del vehículo junto con sus
              trabajos, notas, historial de estados y fotografías.
            </p>
            <label className="mt-4 block text-sm font-medium text-ink">
              Escribe <span className="font-mono font-bold">ARCHIVAR</span> para confirmar
              <input
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-ink outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-700/10"
                onChange={(event) => setConfirmation(event.target.value)}
                value={confirmation}
              />
            </label>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
                disabled={busy}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy || confirmation !== "ARCHIVAR"}
                onClick={archiveOrder}
                type="button"
              >
                {busy ? "Archivando..." : "Archivar orden"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
