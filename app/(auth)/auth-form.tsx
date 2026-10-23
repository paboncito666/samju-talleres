"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/auth/return-path";

const schema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("error") === "oauth"
      ? "No se pudo completar el acceso con Google. Inténtalo de nuevo."
      : "",
  );
  const [busy, setBusy] = useState(false);

  function callbackUrl() {
    const destination = safeReturnPath(searchParams.get("next"));
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    const formData = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Revisa tus credenciales.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo completar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.");
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">SAMJU Talleres · Personal</p>
      <h1 className="mt-3 text-2xl font-semibold text-ink">Iniciar sesión</h1>
      <p className="mt-2 text-sm text-muted">
        Accede a la operación del taller.
      </p>
      <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
        <label className="block text-sm font-medium">
          Correo electrónico
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm font-medium">
          Contraseña
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" name="password" type="password" autoComplete="current-password" required />
        </label>
        {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
        <button className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">
          {busy ? "Procesando..." : "Iniciar sesión"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />o continúa con<span className="h-px flex-1 bg-line" /></div>
      <button className="w-full rounded-lg border border-line px-4 py-3 text-sm font-medium hover:bg-mist disabled:opacity-60" disabled={busy} onClick={signInWithGoogle} type="button">
        Continuar con Google
      </button>
      <p className="mt-6 text-center text-sm text-muted">
        ¿Necesitas una cuenta? Solicita una invitación al administrador del taller.
      </p>
    </section>
  );
}
