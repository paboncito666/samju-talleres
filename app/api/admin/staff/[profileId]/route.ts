import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { ACTIVE_STATUSES } from "@/lib/estados";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const profileIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const accountStatusSchema = z.object({ activo: z.boolean() }).strict();
const manageableRoles = ["mecanico", "recepcionista"] as const;

type RouteContext = { params: Promise<{ profileId: string }> };

function isManageableRole(role: string): role is (typeof manageableRoles)[number] {
  return manageableRoles.some((manageableRole) => manageableRole === role);
}

async function getManageableProfile(
  profileId: string,
  auth: Extract<Awaited<ReturnType<typeof authenticateApiRequest>>, { ok: true }>,
) {
  if (!profileIdPattern.test(profileId)) {
    return {
      error: NextResponse.json({ error: "El identificador de cuenta no es válido." }, { status: 400 }),
    };
  }
  if (profileId === auth.userId) {
    return {
      error: NextResponse.json({ error: "No puedes modificar ni eliminar tu propia cuenta." }, { status: 403 }),
    };
  }

  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select("id, rol")
    .eq("id", profileId)
    .maybeSingle();
  if (error) {
    console.error("No se pudo consultar la cuenta de personal.", error);
    return {
      error: NextResponse.json({ error: "No se pudo consultar la cuenta." }, { status: 500 }),
    };
  }
  if (!profile) {
    return {
      error: NextResponse.json({ error: "La cuenta ya no existe." }, { status: 404 }),
    };
  }
  if (!isManageableRole(profile.rol)) {
    return {
      error: NextResponse.json({ error: "Las cuentas de administrador están protegidas." }, { status: 403 }),
    };
  }

  return { profile };
}

function getAdminClient() {
  try {
    return createSupabaseAdminClient();
  } catch (error) {
    console.error("No se pudo inicializar la administración de cuentas.", error);
    return null;
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin"]);
  if (!auth.ok) return auth.response;

  const parsed = accountStatusSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "El estado de la cuenta no es válido." },
      { status: 400 },
    );
  }

  const { profileId } = await params;
  const target = await getManageableProfile(profileId, auth);
  if (target.error) return target.error;

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "El servidor no está configurado para administrar cuentas." },
      { status: 500 },
    );
  }

  const { data, error } = await adminClient
    .from("profiles")
    .update({ activo: parsed.data.activo })
    .eq("id", target.profile.id)
    .in("rol", [...manageableRoles])
    .select("id, activo")
    .maybeSingle();
  if (error) {
    console.error("No se pudo actualizar el estado de la cuenta.", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la cuenta." },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "La cuenta cambió mientras se procesaba la solicitud. Actualiza la página e inténtalo de nuevo." },
      { status: 409 },
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin"]);
  if (!auth.ok) return auth.response;

  const { profileId } = await params;
  const target = await getManageableProfile(profileId, auth);
  if (target.error) return target.error;

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "El servidor no está configurado para administrar cuentas." },
      { status: 500 },
    );
  }

  const activeOrders = await Promise.all([
    adminClient
      .from("ordenes_trabajo")
      .select("id", { count: "exact", head: true })
      .eq("mecanico_id", target.profile.id)
      .in("estado", [...ACTIVE_STATUSES])
      .is("archivada_en", null),
    adminClient
      .from("ordenes_trabajo")
      .select("id", { count: "exact", head: true })
      .eq("recepcionista_id", target.profile.id)
      .in("estado", [...ACTIVE_STATUSES])
      .is("archivada_en", null),
  ]);
  const failedOrderCheck = activeOrders.find((result) => result.error);
  if (failedOrderCheck?.error) {
    console.error("No se pudieron comprobar las órdenes activas antes de eliminar la cuenta.", failedOrderCheck.error);
    return NextResponse.json(
      { error: "No se pudo comprobar si la cuenta está vinculada a órdenes activas." },
      { status: 500 },
    );
  }
  if (activeOrders.some((result) => (result.count ?? 0) > 0)) {
    return NextResponse.json(
      { error: "Reasigna o cierra las órdenes activas de esta cuenta antes de eliminarla. También puedes desactivarla mientras tanto." },
      { status: 409 },
    );
  }

  const { error } = await adminClient.auth.admin.deleteUser(target.profile.id);
  if (error) {
    console.error("No se pudo eliminar la cuenta de personal.", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la cuenta." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id: target.profile.id } });
}
