import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateStaffRole } from "@/app/admin/personal/actions";
import { isProfileRole } from "@/lib/auth/permissions";
import { StaffInvitationForm } from "./invitation-form";

interface PageProps {
  searchParams: { actualizado?: string };
}

export const dynamic = "force-dynamic";

const roleLabels = {
  admin: "Administrador",
  mecanico: "Mecánico",
  recepcionista: "Recepcionista",
} as const;

function getRoleLabel(role: unknown) {
  if (!isProfileRole(role)) throw new Error("Se encontró un rol de perfil no válido.");
  return roleLabels[role];
}

export default async function StaffRolesPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nombre, rol, activo")
    .order("nombre");
  if (error) throw new Error(`No se pudo cargar el personal: ${error.message}`);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Administración
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Roles del personal
        </h1>
        <p className="mt-2 text-sm text-muted">
          Asigna el rol de mecánico o recepcionista a las cuentas del equipo.
        </p>
      </header>

      {searchParams.actualizado === "1" && (
        <p className="rounded-xl border border-sage-foreground/20 bg-white p-4 text-sm text-ink" role="status">
          El rol se actualizó correctamente.
        </p>
      )}

      <StaffInvitationForm />

      {profiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          No hay cuentas registradas.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-mist text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-4">
                    <span className="block font-medium text-ink">{profile.nombre}</span>
                    <span className="text-xs text-muted">{profile.id}</span>
                  </td>
                  <td className="px-4 py-4 text-ink">
                    {profile.activo ? "Activo" : "Inactivo"}
                  </td>
                  <td className="px-4 py-4 text-ink">{getRoleLabel(profile.rol)}</td>
                  <td className="px-4 py-4">
                    {profile.rol === "admin" ? (
                      <span className="text-xs text-muted">No modificable</span>
                    ) : (
                      <form action={updateStaffRole} className="flex items-center gap-2">
                        <input name="profileId" type="hidden" value={profile.id} />
                        <label className="sr-only" htmlFor={`role-${profile.id}`}>
                          Rol de {profile.nombre}
                        </label>
                        <select
                          className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
                          defaultValue={profile.rol}
                          id={`role-${profile.id}`}
                          name="role"
                        >
                          <option value="mecanico">Mecánico</option>
                          <option value="recepcionista">Recepcionista</option>
                        </select>
                        <button
                          className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white"
                          type="submit"
                        >
                          Guardar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
