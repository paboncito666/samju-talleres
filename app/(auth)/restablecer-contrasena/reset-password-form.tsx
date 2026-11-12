"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({
        password,
        data: { force_password_setup: false },
      });
      if (error) throw error;
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contraseña. Solicita un enlace nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
      <label className="block text-sm font-medium text-ink">
        Nueva contraseña
        <input
          autoComplete="new-password"
          className="mt-2 w-full rounded-xl border border-line bg-background px-3.5 py-3 text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        Confirmar contraseña
        <input
          autoComplete="new-password"
          className="mt-2 w-full rounded-xl border border-line bg-background px-3.5 py-3 text-ink outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
          minLength={8}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </label>
      {errorMessage && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
