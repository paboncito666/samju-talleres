import { redirect } from "next/navigation";
import { AccountSettings } from "@/app/components/account/account-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("nombre, avatar_url")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Preferencias personales
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Ajustes de la cuenta
        </h1>
        <p className="mt-2 text-sm text-muted">
          Administra la información de tu perfil y tus credenciales.
        </p>
      </header>
      <AccountSettings
        avatarUrl={profile.avatar_url}
        email={user.email ?? ""}
        name={profile.nombre}
      />
    </main>
  );
}
