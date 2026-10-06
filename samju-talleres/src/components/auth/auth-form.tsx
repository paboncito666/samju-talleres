"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail, UserRound, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const credentialsSchema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().trim().email("Ingresa un correo electrónico válido."),
    password: z.string().min(1, "Ingresa tu contraseña."),
  })
  .superRefine((values, context) => {
    if (values.fullName !== undefined && values.fullName.trim().length === 0) {
      context.addIssue({
        code: "custom",
        message: "Ingresa tu nombre.",
        path: ["fullName"],
      });
    }

    if (values.fullName !== undefined && values.password.length < 8) {
      context.addIssue({
        code: "custom",
        message: "La contraseña debe tener al menos 8 caracteres.",
        path: ["password"],
      });
    }
  });

type Credentials = z.infer<typeof credentialsSchema>;
type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
  initialError?: string;
}

const callbackUrl = () =>
  `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;

export function AuthForm({ mode, initialError }: AuthFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState(
    initialError ? "No se pudo completar el acceso con Google. Inténtalo de nuevo." : "",
  );
  const [notice, setNotice] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isRegister = mode === "register";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      fullName: isRegister ? "" : undefined,
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: Credentials) {
    setFormError("");
    setNotice("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (isRegister) {
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
          setNotice(
            "Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión.",
          );
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
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud. Inténtalo de nuevo.",
      );
    }
  }

  async function signInWithGoogle() {
    setFormError("");
    setIsGoogleLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });

      if (error) throw error;
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
      );
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-white/80 bg-surface/95 shadow-[0_28px_80px_-42px_rgba(37,41,39,0.35)] backdrop-blur">
      <CardHeader className="items-center px-7 pb-2 pt-8 text-center sm:px-9 sm:pt-10">
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-sage text-sage-foreground">
          <Wrench aria-hidden="true" size={21} strokeWidth={1.8} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Portal del equipo
        </p>
        <CardTitle className="mt-2 text-2xl tracking-tight text-ink">
          {isRegister ? "Crea tu cuenta" : "Qué bueno verte"}
        </CardTitle>
        <CardDescription>
          {isRegister
            ? "Registra tu acceso al espacio de trabajo SAMJU."
            : "Inicia sesión para continuar con tu jornada."}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-7 pb-8 pt-6 sm:px-9 sm:pb-10">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="fullName">
                Nombre completo
              </label>
              <div className="relative">
                <UserRound
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  size={17}
                />
                <Input
                  autoComplete="name"
                  className="pl-10"
                  id="fullName"
                  placeholder="Tu nombre"
                  {...register("fullName")}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-rose-foreground" id="fullName-error" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={17}
              />
              <Input
                autoComplete="email"
                className="pl-10"
                id="email"
                placeholder="nombre@taller.com"
                type="email"
                {...register("email")}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-foreground" id="email-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={17}
              />
              <Input
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="pl-10"
                id="password"
                placeholder={isRegister ? "Al menos 8 caracteres" : "Tu contraseña"}
                type="password"
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-rose-foreground" id="password-error" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {formError && (
            <p
              className="rounded-lg border border-rose/80 bg-rose px-3 py-2.5 text-sm text-rose-foreground"
              role="alert"
            >
              {formError}
            </p>
          )}
          {notice && (
            <p
              className="rounded-lg border border-sage/80 bg-sage px-3 py-2.5 text-sm text-sage-foreground"
              role="status"
            >
              {notice}
            </p>
          )}

          <Button
            className="mt-2 w-full"
            disabled={isSubmitting || isGoogleLoading}
            size="lg"
            type="submit"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
                {isRegister ? "Creando cuenta..." : "Iniciando sesión..."}
              </>
            ) : (
              <>
                {isRegister ? "Crear cuenta" : "Iniciar sesión"}
                <ArrowRight aria-hidden="true" size={17} />
              </>
            )}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-muted">o continúa con</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting || isGoogleLoading}
          onClick={signInWithGoogle}
          variant="outline"
        >
          {isGoogleLoading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
          ) : (
            <GoogleMark />
          )}
          Continuar con Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <Link
            className="font-semibold text-ink underline-offset-4 hover:underline"
            href={isRegister ? "/login" : "/register"}
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </Link>
        </p>
        {isRegister && (
          <p className="mt-4 text-center text-xs leading-5 text-muted">
            El acceso está destinado exclusivamente al personal de SAMJU Talleres.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 48 48">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.2-1.8 13.6-4.8L31 34.1c-1.8 1.2-4.1 1.9-7 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z"
      />
      <path
        fill="#EA4335"
        d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.3 19.3 0 0 0 24 4 20 20 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"
      />
    </svg>
  );
}
