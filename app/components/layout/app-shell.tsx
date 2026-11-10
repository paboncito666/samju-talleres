import Link from "next/link";
import { redirect } from "next/navigation";
import { UserMenu } from "@/app/components/layout/user-menu";
import { signOutAction } from "@/app/auth/actions";
import { canAccessPath, isProfileRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vehiculos", label: "Vehículos" },
  { href: "/ordenes", label: "Órdenes" },
  { href: "/historial", label: "Historial" },
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
    .select("nombre, rol, activo, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  if (!profile || !profile.activo || !isProfileRole(profile.rol)) redirect("/forbidden");

  const links = navigation.filter(({ href }) => canAccessPath(profile.rol, href));

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-20 border-b border-line bg-surface shadow-[0_8px_24px_-24px_rgba(27,54,42,0.6)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="group flex items-center gap-3" href="/dashboard">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-[#456a52] font-semibold text-white shadow-md transition duration-200 group-hover:-rotate-3 group-hover:scale-105">S</span>
            <span><strong className="block text-sm tracking-[0.12em] text-ink">SAMJU</strong><span className="text-xs text-muted">Talleres · Personal</span></span>
          </Link>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-2">
            {links.map(({ href, label }) => (
              <Link
                aria-current={activePath === href ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm transition duration-200 ${activePath === href ? "bg-primary font-semibold text-white shadow-sm" : "text-muted hover:-translate-y-0.5 hover:bg-mist hover:text-ink"}`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <UserMenu
            avatarUrl={profile.avatar_url}
            email={user.email ?? ""}
            name={profile.nombre}
            role={profile.rol}
            signOutAction={signOutAction}
          />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">{children}</div>
    </div>
  );
}
