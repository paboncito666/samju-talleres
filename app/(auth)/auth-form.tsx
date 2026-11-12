"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Wrench } from "lucide-react";
import { z } from "zod";
import { createSupabaseBrowserClient, setSupabaseSessionPersistence } from "@/lib/supabase/client";
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
      : searchParams.get("error") === "recovery"
        ? "El enlace de recuperación expiró o ya fue utilizado. Solicita uno nuevo."
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

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
      setSupabaseSessionPersistence(remember);
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
      setSupabaseSessionPersistence(remember);
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
    <section className="admin-reveal mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_32px_100px_-44px_rgba(27,54,42,0.42)] md:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#192722] via-[#223b31] to-[#426653] p-10 text-white md:flex">
        <div aria-hidden="true" className="admin-orb admin-orb-one" />
        <div aria-hidden="true" className="admin-orb admin-orb-two" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-white/10">
              <Wrench className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-[0.16em]">SAMJU TALLERES</span>
          </div>
          <p className="mt-20 max-w-sm text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
            Cada detalle en orden
          </p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            El taller conectado, el trabajo bajo control.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/70">
            Accede a las órdenes, vehículos y equipo desde un solo lugar.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-white/70">
          <ShieldCheck className="size-4 text-emerald-200" aria-hidden="true" />
          Acceso seguro para el personal del taller
        </div>
      </aside>

      <div className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-12">
        <div className="w-full max-w-md">
          <div className="mb-9 md:hidden">
            <span className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              <Wrench className="size-3.5" aria-hidden="true" />
              SAMJU Talleres · Personal
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Bienvenido de nuevo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Iniciar sesión</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Accede a la operación diaria del taller.</p>

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <label className="block text-sm font-medium text-ink">
              Correo electrónico
              <span className="relative mt-2 block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
                <input className="w-full rounded-xl border border-line bg-background py-3 pl-11 pr-3.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required />
              </span>
            </label>
            <label className="block text-sm font-medium text-ink">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
                <input className="w-full rounded-xl border border-line bg-background py-3 pl-11 pr-3.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required />
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
                <input
                  checked={remember}
                  className="size-4 rounded border-line accent-emerald-700 focus:ring-emerald-700"
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                />
                Mantener sesión iniciada
              </label>
              <Link className="font-medium text-emerald-800 underline-offset-4 transition hover:underline dark:text-emerald-300" href="/olvide-contrasena">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {errorMessage && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">{errorMessage}</p>}
            <button className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(28,56,41,0.75)] transition hover:-translate-y-0.5 hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">
              {busy ? "Procesando..." : "Iniciar sesión"}
              {!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />o continúa con<span className="h-px flex-1 bg-line" /></div>
          <button className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-60" disabled={busy} onClick={signInWithGoogle} type="button">
            Continuar con Google
          </button>
          <p className="mt-7 text-center text-sm leading-6 text-muted">
            ¿Necesitas una cuenta? Solicita una invitación al administrador del taller.
          </p>
        </div>
      </div>
    </section>
  );
}
