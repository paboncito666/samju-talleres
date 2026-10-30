import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkOrderForm } from "@/app/components/ordenes/work-order-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ vehiculoId?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`No se pudo validar la sesión: ${userError.message}`);
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profileError) throw new Error(`No se pudo consultar el perfil: ${profileError.message}`);
  if (profile.rol === "mecanico") redirect("/forbidden");

  const [{ data: vehicles, error: vehiclesError }, { data: mechanics, error: mechanicsError }] =
    await Promise.all([
      supabase.from("vehiculos").select("id, placa, marca, modelo").order("placa"),
      supabase.from("profiles").select("id, nombre").eq("rol", "mecanico").eq("activo", true).order("nombre"),
    ]);
  if (vehiclesError) throw new Error(`No se pudieron consultar los vehículos: ${vehiclesError.message}`);
  if (mechanicsError) throw new Error(`No se pudo cargar el personal: ${mechanicsError.message}`);

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Operación diaria</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Abrir orden de trabajo</h1>
        <p className="mt-2 text-sm text-muted">Al guardar la orden podrás adjuntar varias fotos de ingreso.</p>
      </header>
      {vehicles.length === 0 ? (
        <section className="rounded-2xl border border-line bg-white p-6">
          <p className="text-sm text-muted">Primero registra un vehículo para poder abrir su orden.</p>
          <Link className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" href="/vehiculos/nuevo">Registrar vehículo</Link>
        </section>
      ) : (
        <WorkOrderForm
          vehicles={vehicles}
          mechanics={mechanics}
          initialVehicleId={filters.vehiculoId ?? ""}
        />
      )}
    </main>
  );
}
