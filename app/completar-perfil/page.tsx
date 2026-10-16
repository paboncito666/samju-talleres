import { redirect } from "next/navigation";
import { completeProfileAction } from "@/app/completar-perfil/actions";
import { safeReturnPath } from "@/lib/auth/return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams: { error?: string; next?: string };
}

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("nombre_confirmado")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar el perfil: ${error.message}`);
  if (!profile) throw new Error("No existe un perfil para la cuenta autenticada.");
  if (profile.nombre_confirmado) redirect("/dashboard");

  const errorMessage =
    searchParams.error === "nombre"
      ? "Escribe un nombre de entre 2 y 80 caracteres."
      : searchParams.error === "guardar"
        ? "No se pudo guardar el nombre. Inténtalo de nuevo."
        : "";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-soft sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          SAMJU Talleres · Personal
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">¿Cómo te llamas?</h1>
        <p className="mt-2 text-sm text-muted">
          Elige el nombre que verá el equipo en el taller.
        </p>
        <form action={completeProfileAction} className="mt-7 space-y-4">
          <input name="next" type="hidden" value={safeReturnPath(searchParams.next)} />
          <label className="block text-sm font-medium">
            Nombre
            <input
              autoComplete="name"
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5"
              maxLength={80}
              minLength={2}
              name="nombre"
              required
            />
          </label>
          {errorMessage && (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            Guardar y continuar
          </button>
        </form>
      </section>
    </main>
  );
}
