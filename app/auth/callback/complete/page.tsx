"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessPath, isProfileRole } from "@/lib/auth/permissions";
import { safeReturnPath } from "@/lib/auth/return-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const otpTypes = [
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
] as const;

function isOtpType(value: string | null): value is (typeof otpTypes)[number] {
  return value !== null && otpTypes.some((type) => type === value);
}

export default function AuthCallbackCompletePage() {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState("Validando tu enlace de acceso...");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeAuthentication() {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const authError = query.get("error") ?? fragment.get("error");

      if (authError) {
        const errorCode = query.get("error_code") ?? fragment.get("error_code");
        setMessage(
          errorCode === "otp_expired"
            ? "Este enlace ya expiró o fue utilizado. Solicita una nueva invitación al administrador."
            : "No se pudo validar el enlace. Solicita una nueva invitación al administrador.",
        );
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const tokenHash = query.get("token_hash");
      const otpType = query.get("type");
      let authFailure: Error | null = null;

      if (tokenHash && isOtpType(otpType)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        authFailure = error;
      } else {
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        const code = query.get("code");

        if (accessToken && refreshToken) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token !== accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            authFailure = error;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          authFailure = error;
        } else {
          setMessage(
            "El enlace no contiene una sesión válida. Solicita una nueva invitación o inicia sesión de nuevo.",
          );
          return;
        }
      }

      if (authFailure) {
        console.error("No se pudo validar el enlace de autenticación.", authFailure);
        setMessage(
          "El enlace ya expiró, fue utilizado o no es válido. Solicita una nueva invitación al administrador.",
        );
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("No se pudo cargar el usuario después de validar el enlace.", userError);
        setMessage("No se pudo iniciar la sesión. Inténtalo de nuevo.");
        return;
      }

      if (user.user_metadata?.force_password_setup === true) {
        router.replace("/ajustes/establecer-contrasena");
        router.refresh();
        return;
      }

      let profile: { rol: string; activo: boolean } | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabase
          .from("profiles")
          .select("rol, activo")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          console.error("No se pudo consultar el perfil después del acceso.", error);
          setMessage("No se pudo cargar tu perfil. Contacta al administrador del taller.");
          return;
        }
        if (data) {
          profile = data;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      if (!profile || !profile.activo || !isProfileRole(profile.rol)) {
        setMessage("Tu perfil está inactivo o no tiene permisos. Contacta al administrador.");
        return;
      }

      const requestedPath = safeReturnPath(query.get("next"));
      router.replace(
        canAccessPath(profile.rol, requestedPath) ? requestedPath : "/dashboard",
      );
      router.refresh();
    }

    completeAuthentication().catch((error: unknown) => {
      console.error("Falló la validación del enlace de autenticación.", error);
      setMessage("No se pudo completar el acceso. Inténtalo de nuevo.");
    });
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-soft sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          SAMJU Talleres · Personal
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Validando acceso</h1>
        <p className="mt-3 text-sm text-muted" role="status">{message}</p>
        {message !== "Validando tu enlace de acceso..." && (
          <a
            className="mt-6 inline-flex rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white"
            href="/login"
          >
            Volver al inicio de sesión
          </a>
        )}
      </section>
    </main>
  );
}
