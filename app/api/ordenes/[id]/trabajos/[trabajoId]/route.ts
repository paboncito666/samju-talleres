import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { workItemUpdateSchema } from "@/lib/validations/api";

type RouteContext = { params: Promise<{ id: string; trabajoId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, trabajoId } = await params;
  const auth = await authenticateApiRequest(["admin", "mecanico", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const { data: order, error: orderError } = await auth.supabase
    .from("ordenes_trabajo")
    .select("id, archivada_en")
    .eq("id", id)
    .maybeSingle();
  if (orderError) {
    console.error("No se pudo verificar la orden antes de actualizar un trabajo.", orderError);
    return NextResponse.json({ error: "No se pudo consultar la orden." }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Orden no encontrada o sin acceso." }, { status: 404 });
  if (order.archivada_en) {
    return NextResponse.json({ error: "No se pueden actualizar trabajos de una orden archivada." }, { status: 409 });
  }

  const parsed = workItemUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de actualización del trabajo inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("trabajos_realizados")
    .update(parsed.data)
    .eq("id", trabajoId)
    .eq("orden_id", id)
    .select("id, orden_id, descripcion, tipo, completado, creado_en")
    .maybeSingle();
  if (error) {
    console.error("No se pudo actualizar el trabajo de la orden.", error);
    return NextResponse.json({ error: "No se pudo actualizar el trabajo." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Trabajo no encontrado o sin acceso." }, { status: 404 });

  return NextResponse.json({ data });
}
