import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Identificador de orden inválido." }, { status: 400 });
  }
  const orderId = id.toLowerCase();

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    console.error("No se pudo inicializar el archivado de órdenes.", error);
    return NextResponse.json(
      { error: "El servidor no está configurado para archivar órdenes." },
      { status: 500 },
    );
  }

  const { data: order, error: readError } = await admin
    .from("ordenes_trabajo")
    .select("id, vehiculo_id, archivada_en")
    .eq("id", orderId)
    .maybeSingle();
  if (readError) {
    console.error("No se pudo consultar la orden antes de archivarla.", readError);
    return NextResponse.json({ error: "No se pudo consultar la orden." }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
  }
  if (order.archivada_en) {
    return NextResponse.json({ error: "La orden ya está archivada." }, { status: 409 });
  }

  const { data: archivedOrder, error: archiveError } = await admin
    .from("ordenes_trabajo")
    .update({
      archivada_en: new Date().toISOString(),
      archivada_por: auth.userId,
    })
    .eq("id", orderId)
    .is("archivada_en", null)
    .select("id, vehiculo_id, archivada_en")
    .maybeSingle();
  if (archiveError) {
    console.error("No se pudo archivar la orden.", archiveError);
    return NextResponse.json({ error: "No se pudo archivar la orden." }, { status: 500 });
  }
  if (!archivedOrder) {
    return NextResponse.json(
      { error: "La orden cambió en otra sesión. Actualiza la página e inténtalo de nuevo." },
      { status: 409 },
    );
  }

  return NextResponse.json({ data: archivedOrder });
}
