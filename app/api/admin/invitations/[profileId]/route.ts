import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { isPendingStaffInvitation } from "@/lib/admin/staff-invitations";
import { ACTIVE_STATUSES } from "@/lib/estados";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const profileIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const manageableRoles = ["mecanico", "recepcionista"] as const;

type RouteContext = { params: Promise<{ profileId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin"]);
  if (!auth.ok) return auth.response;

  const { profileId } = await params;
  if (!profileIdPattern.test(profileId)) {
    return NextResponse.json(
      { error: "El identificador de invitación no es válido." },
      { status: 400 },
    );
  }
  if (profileId === auth.userId) {
    return NextResponse.json(
      { error: "No puedes cancelar tu propia cuenta." },
      { status: 403 },
    );
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("id, rol")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) {
    console.error("No se pudo consultar el perfil de la invitación.", profileError);
    return NextResponse.json(
      { error: "No se pudo consultar la invitación." },
      { status: 500 },
    );
  }
  if (!profile) {
    return NextResponse.json(
      { error: "La invitación ya no existe." },
      { status: 404 },
    );
  }
  if (!manageableRoles.includes(profile.rol as (typeof manageableRoles)[number])) {
    return NextResponse.json(
      { error: "Solo se pueden cancelar invitaciones de personal operativo." },
      { status: 403 },
    );
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    console.error("No se pudo inicializar la administración de invitaciones.", error);
    return NextResponse.json(
      { error: "El servidor no está configurado para cancelar invitaciones." },
      { status: 500 },
    );
  }

  const { data, error: userError } = await adminClient.auth.admin.getUserById(profileId);
  if (userError) {
    console.error("No se pudo validar la cuenta de la invitación.", userError);
    return NextResponse.json(
      { error: "No se pudo validar la invitación." },
      { status: 500 },
    );
  }
  if (!isPendingStaffInvitation(data.user)) {
    return NextResponse.json(
      { error: "Esta cuenta ya aceptó la invitación o no tiene una invitación pendiente." },
      { status: 409 },
    );
  }

  const activeOrders = await Promise.all([
    adminClient
      .from("ordenes_trabajo")
      .select("id", { count: "exact", head: true })
      .eq("mecanico_id", profileId)
      .in("estado", [...ACTIVE_STATUSES])
      .is("archivada_en", null),
    adminClient
      .from("ordenes_trabajo")
      .select("id", { count: "exact", head: true })
      .eq("recepcionista_id", profileId)
      .in("estado", [...ACTIVE_STATUSES])
      .is("archivada_en", null),
  ]);
  const failedOrderCheck = activeOrders.find((result) => result.error);
  if (failedOrderCheck?.error) {
    console.error("No se pudieron comprobar las órdenes activas antes de cancelar la invitación.", failedOrderCheck.error);
    return NextResponse.json(
      { error: "No se pudo comprobar si la invitación está vinculada a órdenes activas." },
      { status: 500 },
    );
  }
  if (activeOrders.some((result) => (result.count ?? 0) > 0)) {
    return NextResponse.json(
      { error: "Reasigna o cierra las órdenes activas antes de cancelar esta invitación." },
      { status: 409 },
    );
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(profileId);
  if (deleteError) {
    console.error("No se pudo cancelar la invitación del personal.", deleteError);
    return NextResponse.json(
      { error: "No se pudo cancelar la invitación." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id: profileId } });
}
