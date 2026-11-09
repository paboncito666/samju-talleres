"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, MailPlus, Send, UserPlus } from "lucide-react";
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
    <section className="admin-reveal relative overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-100/60 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
              <UserPlus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">Invitar a alguien nuevo</h2>
              <p className="mt-1 max-w-xl text-sm leading-5 text-muted">
                Recibirá un enlace para activar su cuenta y crear una contraseña.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs font-medium text-muted">
            <MailPlus className="size-3.5" aria-hidden="true" />
            Acceso por invitación
          </span>
        </div>
        <form className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.15fr_0.78fr_auto]" onSubmit={submit}>
          <label className="text-sm font-medium text-ink">
            Nombre completo
            <input
              autoComplete="name"
              className="admin-field mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition duration-200 placeholder:text-muted/70 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              maxLength={80}
              name="nombre"
              placeholder="Ej. María Gómez"
              required
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Correo electrónico
            <input
              autoComplete="email"
              className="admin-field mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition duration-200 placeholder:text-muted/70 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              maxLength={254}
              name="email"
              placeholder="nombre@correo.com"
              required
              type="email"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Rol inicial
            <select
              className="admin-field mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition duration-200 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
              defaultValue="mecanico"
              name="rol"
            >
              <option value="mecanico">Mecánico</option>
              <option value="recepcionista">Recepcionista</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(28,56,41,0.7)] transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_14px_25px_-14px_rgba(28,56,41,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Send className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              )}
              {busy ? "Enviando..." : "Enviar invitación"}
              {!busy && <ArrowRight className="size-4 opacity-70" aria-hidden="true" />}
            </button>
          </div>
          {error && (
            <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 sm:col-span-2 xl:col-span-4" role="alert">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {notice && (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900 sm:col-span-2 xl:col-span-4" role="status">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
