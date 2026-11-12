import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPendingStaffInvitation } from "@/lib/admin/staff-invitations";
import { updateStaffRole } from "@/app/admin/personal/actions";
import { isProfileRole } from "@/lib/auth/permissions";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleUserRound,
  ShieldCheck,
  UsersRound,
  Wrench,
} from "lucide-react";
import { StaffInvitationForm } from "./invitation-form";
import { StaffAccountActions } from "./staff-account-actions";

interface PageProps {
  searchParams: Promise<{ actualizado?: string; invitacion_cancelada?: string }>;
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
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nombre, rol, activo")
    .order("nombre");
  if (error) throw new Error(`No se pudo cargar el personal: ${error.message}`);
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    console.error("No se pudo inicializar la consulta de invitaciones pendientes.", error);
    throw new Error("No se pudo cargar el estado de las invitaciones del personal.");
  }
  const invitationResults = await Promise.all(
    profiles.map((profile) => adminClient.auth.admin.getUserById(profile.id)),
  );
  const invitationsByProfile = new Map(
    invitationResults.map((result, index) => {
      if (result.error) {
        console.error("No se pudo consultar una cuenta del personal en Auth.", result.error);
        throw new Error("No se pudo cargar el estado de las invitaciones del personal.");
      }
      return [
        profiles[index].id,
        {
          email: result.data.user.email ?? null,
          pending: isPendingStaffInvitation(result.data.user),
        },
      ] as const;
    }),
  );
  const activeCount = profiles.filter(
    (profile) => profile.activo && !invitationsByProfile.get(profile.id)?.pending,
  ).length;
  const mechanicCount = profiles.filter((profile) => profile.rol === "mecanico").length;
  const receptionCount = profiles.filter((profile) => profile.rol === "recepcionista").length;

  return (
    <main className="admin-stagger space-y-7">
      <header className="admin-reveal relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#192722] via-[#223b31] to-[#426653] px-6 py-8 text-white shadow-[0_24px_70px_-38px_rgba(27,54,42,0.75)] sm:px-9 sm:py-10">
        <div aria-hidden="true" className="admin-orb admin-orb-one" />
        <div aria-hidden="true" className="admin-orb admin-orb-two" />
        <div className="relative z-10 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 backdrop-blur">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Administración
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tu equipo, en sintonía
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Invita a las personas del taller y asigna los permisos adecuados para cada función.
            </p>
          </div>
          <a
            className="group inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#294435]"
            href="#equipo"
          >
            Ver equipo
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </a>
        </div>
        <div className="relative z-10 mt-8 grid max-w-3xl grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm sm:p-4">
            <div className="flex min-h-9 items-start justify-between gap-1 text-white/70 sm:min-h-0">
              <span className="text-[11px] font-medium leading-4 sm:text-xs">Personas en el equipo</span>
              <UsersRound className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl">{profiles.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm sm:p-4">
            <div className="flex min-h-9 items-start justify-between gap-1 text-white/70 sm:min-h-0">
              <span className="text-[11px] font-medium leading-4 sm:text-xs">Cuentas activas</span>
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm sm:p-4">
            <div className="flex min-h-9 items-start justify-between gap-1 text-white/70 sm:min-h-0">
              <span className="text-[11px] font-medium leading-4 sm:text-xs">Roles operativos</span>
              <Wrench className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl">{mechanicCount + receptionCount}</p>
          </div>
        </div>
      </header>

      {filters.actualizado === "1" && (
        <div className="admin-reveal flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 shadow-sm" role="status">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100">
            <Check className="size-4" aria-hidden="true" />
          </span>
          <span className="font-medium">El rol se actualizó correctamente.</span>
        </div>
      )}

      {filters.invitacion_cancelada === "1" && (
        <div className="admin-reveal flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 shadow-sm" role="status">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100">
            <Check className="size-4" aria-hidden="true" />
          </span>
          <span className="font-medium">La invitación se canceló y el enlace anterior ya no es válido.</span>
        </div>
      )}

      <StaffInvitationForm />

      <section className="admin-reveal space-y-4" id="equipo">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Personas</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Equipo del taller</h2>
          </div>
          <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted">
            {profiles.length} {profiles.length === 1 ? "cuenta" : "cuentas"}
          </span>
        </div>
        {profiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center shadow-soft">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-mist text-muted">
              <UsersRound className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold text-ink">Aún no hay personas en el equipo</h3>
            <p className="mt-1 text-sm text-muted">Envía una invitación para comenzar a organizar el taller.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {profiles.map((profile) => {
              const isAdmin = profile.rol === "admin";
              const isMechanic = profile.rol === "mecanico";
              const invitation = invitationsByProfile.get(profile.id);
              const RoleIcon = isAdmin ? ShieldCheck : isMechanic ? Wrench : CircleUserRound;
              return (
                <article
                  className="group rounded-3xl border border-line bg-white p-4 shadow-[0_12px_35px_-28px_rgba(37,41,39,0.35)] transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_50px_-32px_rgba(37,72,53,0.38)] sm:p-5"
                  key={profile.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl transition duration-300 group-hover:scale-105 ${isAdmin ? "bg-amber-100 text-amber-800" : isMechanic ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>
                        <RoleIcon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-ink">{profile.nombre}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {invitation?.email ?? "Correo no disponible"}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${invitation?.pending ? "bg-amber-50 text-amber-800" : profile.activo ? "bg-emerald-50 text-emerald-800" : "bg-rose-foreground/10 text-rose-foreground"}`}>
                      <span className={`size-1.5 rounded-full ${invitation?.pending ? "bg-amber-500" : profile.activo ? "bg-emerald-500" : "bg-rose-foreground"}`} />
                      {invitation?.pending ? "Invitación pendiente" : profile.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Rol actual</span>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${isAdmin ? "bg-amber-50 text-amber-800" : isMechanic ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"}`}>
                        {getRoleLabel(profile.rol)}
                      </span>
                    </div>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Rol protegido
                      </span>
                    ) : (
                      <form action={updateStaffRole} className="flex w-full items-center gap-2 sm:w-auto">
                        <input name="profileId" type="hidden" value={profile.id} />
                        <label className="sr-only" htmlFor={`role-${profile.id}`}>
                          Rol de {profile.nombre}
                        </label>
                        <select
                          className="min-w-0 flex-1 rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 sm:flex-none"
                          defaultValue={profile.rol}
                          id={`role-${profile.id}`}
                          name="role"
                        >
                          <option value="mecanico">Mecánico</option>
                          <option value="recepcionista">Recepcionista</option>
                        </select>
                        <button
                          className="rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                          type="submit"
                        >
                          Guardar
                        </button>
                      </form>
                    )}
                  </div>
                  {!isAdmin && (
                    <div className="mt-4 border-t border-line pt-4">
                      <StaffAccountActions
                        isActive={profile.activo}
                        isPendingInvitation={invitation?.pending ?? false}
                        name={profile.nombre}
                        profileId={profile.id}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
