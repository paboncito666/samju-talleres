import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(`No se pudo validar el enlace: ${error.message}`);
  if (!user) redirect("/login?error=recovery");

  return (
    <section className="admin-reveal mx-auto w-full max-w-xl rounded-[2rem] border border-line bg-white p-6 shadow-[0_32px_100px_-44px_rgba(27,54,42,0.42)] sm:p-10">
      <div className="mb-8 grid size-12 place-items-center rounded-2xl bg-mist text-primary">
        <KeyRound className="size-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Verificación completada</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Crea una contraseña nueva</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Elige una contraseña segura de al menos 8 caracteres.
      </p>
      <ResetPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link className="font-medium text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-300" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </section>
  );
}
