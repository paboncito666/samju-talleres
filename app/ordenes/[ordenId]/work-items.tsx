"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { workItemCreateSchema } from "@/lib/validations/api";

export interface WorkItem {
  id: string;
  descripcion: string;
  tipo: string;
  completado: boolean;
  creado_en: string;
}

const workTypeLabels: Record<string, string> = {
  mecanico: "Mecánico",
  electrico: "Eléctrico",
  latoneria: "Latonería",
  pintura: "Pintura",
  preventivo: "Preventivo",
  otro: "Otro",
};

export function WorkItems({
  initialItems,
  orderId,
}: {
  initialItems: WorkItem[];
  orderId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const parsed = workItemCreateSchema.safeParse({
      descripcion: values.descripcion,
      tipo: values.tipo,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa la descripción del trabajo.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/ordenes/${orderId}/trabajos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo agregar el trabajo.");
      setItems((current) => [result.data, ...current]);
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: WorkItem) {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/ordenes/${orderId}/trabajos/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completado: !item.completado }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar el trabajo.");
      setItems((current) => current.map((candidate) => candidate.id === item.id ? result.data : candidate));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-semibold text-ink">Trabajos de la orden</h2>
        <p className="mt-1 text-sm text-muted">Desglosa las tareas y marca su avance.</p>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aún no hay trabajos específicos registrados.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {items.map((item) => (
            <li className="flex items-start gap-3 py-3" key={item.id}>
              <input
                aria-label={`Marcar completado: ${item.descripcion}`}
                checked={item.completado}
                className="mt-1 size-4 accent-ink"
                disabled={busy}
                onChange={() => void toggle(item)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.completado ? "text-muted line-through" : "text-ink"}`}>
                  {item.descripcion}
                </p>
                <p className="mt-1 text-xs text-muted">{workTypeLabels[item.tipo] ?? item.tipo}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.completado ? "bg-sage-foreground/10 text-sage-foreground" : "bg-mist text-muted"}`}>
                {item.completado ? "Completado" : "Pendiente"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_190px_auto]" onSubmit={submit}>
        <label className="text-sm font-medium text-ink">
          Descripción del trabajo
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" maxLength={2000} name="descripcion" required />
        </label>
        <label className="text-sm font-medium text-ink">
          Tipo
          <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue="mecanico" name="tipo">
            {Object.entries(workTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy} type="submit">
            {busy ? "Guardando..." : "Agregar trabajo"}
          </button>
        </div>
      </form>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
