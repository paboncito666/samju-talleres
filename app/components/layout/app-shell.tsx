import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { canAccessPath, isProfileRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vehiculos", label: "Vehículos" },
  { href: "/ordenes", label: "Órdenes" },
  { href: "/admin/personal", label: "Personal" },
];

export async function AppShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  if (!profile || !profile.activo || !isProfileRole(profile.rol)) redirect("/forbidden");

  const links = navigation.filter(({ href }) => canAccessPath(profile.rol, href));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="grid size-10 place-items-center rounded-xl bg-ink font-semibold text-white">S</span>
            <span><strong className="block text-sm tracking-[0.12em] text-ink">SAMJU</strong><span className="text-xs text-muted">Talleres · Personal</span></span>
          </Link>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-2">
            {links.map(({ href, label }) => (
              <Link
                aria-current={activePath === href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm ${activePath === href ? "bg-mist font-semibold text-ink" : "text-muted hover:bg-mist"}`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block"><span className="block text-sm font-medium text-ink">{profile.nombre}</span><span className="text-xs capitalize text-muted">{profile.rol}</span></span>
            <form action={signOutAction}>
              <button className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-mist" type="submit">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">{children}</div>
    </div>
  );
}
