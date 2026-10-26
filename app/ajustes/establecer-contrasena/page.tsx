import { redirect } from "next/navigation";
import { PasswordSetupForm } from "./password-setup-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PasswordSetupPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(`No se pudo validar la sesión: ${error.message}`);
  if (!user) redirect("/login");
  if (user.user_metadata?.force_password_setup !== true) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Primer acceso
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Elige tu contraseña
        </h1>
        <p className="mt-2 text-sm text-muted">
          Antes de continuar, crea una contraseña para tu cuenta.
        </p>
      </header>
      <PasswordSetupForm />
    </main>
  );
}
