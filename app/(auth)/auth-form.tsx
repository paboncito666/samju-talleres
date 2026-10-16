"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/auth/return-path";

const schema = z.object({
  fullName: z.string().optional(),
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});
type Credentials = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("error") === "oauth"
      ? "No se pudo completar el acceso con Google. Inténtalo de nuevo."
      : "",
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const registerMode = mode === "register";
  const form = useForm<Credentials>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  function callbackUrl() {
    const destination = safeReturnPath(searchParams.get("next"));
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
  }

  async function submit(values: Credentials) {
    setBusy(true);
    setErrorMessage("");
    setNotice("");
    if (registerMode && !values.fullName?.trim()) {
      setErrorMessage("Ingresa tu nombre.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      if (registerMode) {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { full_name: values.fullName?.trim() },
            emailRedirectTo: callbackUrl(),
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
      }
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
      <h1 className="mt-3 text-2xl font-semibold text-ink">
        {registerMode ? "Crear cuenta del equipo" : "Iniciar sesión"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {registerMode ? "Registra tu acceso al espacio interno." : "Accede a la operación del taller."}
      </p>
      <form className="mt-7 space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        {registerMode && (
          <label className="block text-sm font-medium">
            Nombre completo
            <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" {...form.register("fullName")} autoComplete="name" />
          </label>
        )}
        <label className="block text-sm font-medium">
          Correo electrónico
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email && <span className="mt-1 block text-xs text-red-700">{form.formState.errors.email.message}</span>}
        </label>
        <label className="block text-sm font-medium">
          Contraseña
          <input className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5" type="password" autoComplete={registerMode ? "new-password" : "current-password"} {...form.register("password")} />
          {form.formState.errors.password && <span className="mt-1 block text-xs text-red-700">{form.formState.errors.password.message}</span>}
        </label>
        {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
        {notice && <p className="text-sm text-sage-foreground" role="status">{notice}</p>}
        <button className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">
          {busy ? "Procesando..." : registerMode ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />o continúa con<span className="h-px flex-1 bg-line" /></div>
      <button className="w-full rounded-lg border border-line px-4 py-3 text-sm font-medium hover:bg-mist disabled:opacity-60" disabled={busy} onClick={signInWithGoogle} type="button">
        Continuar con Google
      </button>
      <p className="mt-6 text-center text-sm text-muted">
        {registerMode ? "¿Ya tienes cuenta? " : "¿Aún no tienes cuenta? "}
        <Link className="font-semibold text-ink underline" href={registerMode ? "/login" : "/register"}>
          {registerMode ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </section>
  );
}
