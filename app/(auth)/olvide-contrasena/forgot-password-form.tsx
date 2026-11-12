"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const emailSchema = z.string().trim().email("Ingresa un correo válido.");

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorMessage("");
    setNotice("");
    const formData = new FormData(form);
    const parsedEmail = emailSchema.safeParse(formData.get("email"));
    if (!parsedEmail.success) {
      setErrorMessage(parsedEmail.error.issues[0]?.message ?? "Ingresa un correo válido.");
      return;
    }

    setBusy(true);
    try {
      const redirectTo = new URL(
        "/auth/callback?flow=recovery",
        window.location.origin,
      ).toString();
      const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(
        parsedEmail.data,
        { redirectTo },
      );
      if (error) throw error;
      setNotice(
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también la carpeta de spam.",
      );
      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el enlace. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
      <label className="block text-sm font-medium text-ink">
        Correo electrónico
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-line bg-background px-3.5 py-3 text-ink outline-none transition placeholder:text-muted/70 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          name="email"
          placeholder="nombre@correo.com"
          required
          type="email"
        />
      </label>
      {errorMessage && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {errorMessage}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" role="status">
          {notice}
        </p>
      )}
      <button
        className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Enviando enlace..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}
