"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, RotateCcw, ShieldAlert, Trash2, X } from "lucide-react";

type AccountAction =
  | { kind: "status"; active: boolean }
  | { kind: "delete" };

export function StaffAccountActions({
  profileId,
  name,
  isActive,
}: {
  profileId: string;
  name: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [action, setAction] = useState<AccountAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) setAction(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy]);

  async function confirmAction() {
    if (!action) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/staff/${profileId}`, {
        method: action.kind === "delete" ? "DELETE" : "PATCH",
        ...(action.kind === "status"
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ activo: action.active }),
            }
          : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar la cuenta.");

      setNotice(
        action.kind === "delete"
          ? `La cuenta de ${name} se eliminó.`
          : action.active
            ? `La cuenta de ${name} se reactivó.`
            : `La cuenta de ${name} se desactivó.`,
      );
      setAction(null);
      setConfirmation("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  const isDeleteAction = action?.kind === "delete";

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          onClick={() => {
            setError("");
            setAction({ kind: "status", active: !isActive });
          }}
          type="button"
        >
          {isActive ? (
            <><Ban className="size-4" aria-hidden="true" />Desactivar</>
          ) : (
            <><RotateCcw className="size-4" aria-hidden="true" />Reactivar</>
          )}
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-800 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          onClick={() => {
            setError("");
            setConfirmation("");
            setAction({ kind: "delete" });
          }}
          type="button"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Eliminar cuenta
        </button>
      </div>
      {error && !action && (
        <p className="mt-2 flex items-center gap-2 text-sm text-red-800" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {notice && <p className="mt-2 text-sm text-emerald-800" role="status">{notice}</p>}

      {action && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
          <section
            aria-describedby="staff-account-action-description"
            aria-labelledby="staff-account-action-title"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-line bg-white p-5 shadow-2xl sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${isDeleteAction ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                {isDeleteAction ? <Trash2 className="size-5" aria-hidden="true" /> : <ShieldAlert className="size-5" aria-hidden="true" />}
              </span>
              <button
                aria-label="Cerrar confirmación"
                className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-mist hover:text-ink"
                disabled={busy}
                onClick={() => setAction(null)}
                type="button"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink" id="staff-account-action-title">
              {isDeleteAction ? "Eliminar cuenta permanentemente" : action.active ? "Reactivar cuenta" : "Desactivar cuenta"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted" id="staff-account-action-description">
              {isDeleteAction
                ? <>Se eliminará el acceso y el perfil de <strong className="text-ink">{name}</strong>. Las órdenes, notas y demás registros se conservarán, pero dejarán de mostrar la referencia a esta cuenta. No se puede deshacer.</>
                : action.active
                  ? <>Se devolverá el acceso a <strong className="text-ink">{name}</strong> y podrá volver a iniciar sesión.</>
                  : <>Se bloqueará el acceso de <strong className="text-ink">{name}</strong>. Sus órdenes e historial se conservarán y podrás reactivar la cuenta después.</>}
            </p>

            {isDeleteAction && (
              <label className="mt-4 block text-sm font-medium text-ink">
                Escribe <span className="font-mono font-bold">ELIMINAR</span> para confirmar
                <input
                  autoComplete="off"
                  className="mt-2 w-full rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-ink outline-none transition focus:border-red-600 focus:ring-4 focus:ring-red-700/10"
                  onChange={(event) => setConfirmation(event.target.value)}
                  value={confirmation}
                />
              </label>
            )}

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
                disabled={busy}
                onClick={() => setAction(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isDeleteAction ? "bg-red-700 hover:bg-red-800" : "bg-primary hover:bg-primary-hover"}`}
                disabled={busy || (isDeleteAction && confirmation !== "ELIMINAR")}
                onClick={confirmAction}
                type="button"
              >
                {busy ? "Procesando..." : isDeleteAction ? "Eliminar permanentemente" : action.active ? "Reactivar cuenta" : "Desactivar cuenta"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
