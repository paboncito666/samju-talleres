"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordSetupForm() {
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
          : "No se pudo guardar la contraseña. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6"
      onSubmit={submit}
    >
      <label className="block text-sm font-medium text-ink">
        Nueva contraseña
        <input
          autoComplete="new-password"
          className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5"
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
          className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5"
          minLength={8}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </label>
      {errorMessage && (
        <p className="text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? "Guardando..." : "Guardar contraseña y continuar"}
      </button>
    </form>
  );
}
