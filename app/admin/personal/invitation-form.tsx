"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { staffInvitationSchema } from "@/lib/validations/api";

export function StaffInvitationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setNotice("");
    const values = Object.fromEntries(new FormData(form));
    const parsed = staffInvitationSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos de la invitación.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo enviar la invitación.");
      setNotice(`Invitación enviada a ${result.data.email}.`);
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Invitar personal</h2>
      <p className="mt-1 text-sm text-muted">
        La persona recibirá un enlace para activar su cuenta y definir una contraseña.
      </p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium text-ink">
          Nombre completo
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" autoComplete="name" maxLength={80} name="nombre" required />
        </label>
        <label className="text-sm font-medium text-ink">
          Correo electrónico
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
        <label className="text-sm font-medium text-ink">
          Rol inicial
          <select className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" defaultValue="mecanico" name="rol">
            <option value="mecanico">Mecánico</option>
            <option value="recepcionista">Recepcionista</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy} type="submit">
            {busy ? "Enviando..." : "Enviar invitación"}
          </button>
        </div>
        {error && <p className="text-sm text-red-700 sm:col-span-2" role="alert">{error}</p>}
        {notice && <p className="text-sm text-sage-foreground sm:col-span-2" role="status">{notice}</p>}
      </form>
    </section>
  );
}
