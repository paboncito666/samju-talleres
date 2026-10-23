import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import {
  workOrderStatusSchema,
  workOrderStatusTransitions,
} from "@/lib/validations/api";

type RouteContext = { params: { id: string } };
const closedStatuses = new Set(["CALIDAD", "LISTO", "ENTREGADO"]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin", "mecanico", "recepcionista"]);
  if (!auth.ok) return auth.response;
  const parsed = workOrderStatusSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de cambio de estado inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: order, error: readError } = await auth.supabase
    .from("ordenes_trabajo")
    .select("id, estado, mecanico_id, diagnostico")
    .eq("id", params.id)
    .maybeSingle();
  if (readError) {
    console.error("No se pudo leer la orden para cambiar su estado.", readError);
    return NextResponse.json({ error: "No se pudo consultar la orden." }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
  if (auth.role === "mecanico" && order.mecanico_id !== auth.userId) {
    return NextResponse.json({ error: "No tienes asignada esta orden." }, { status: 403 });
  }

  const nextStatus = parsed.data.estado;
  if (!(workOrderStatusTransitions[order.estado as keyof typeof workOrderStatusTransitions] ?? []).includes(nextStatus)) {
    return NextResponse.json({ error: "La transición de estado no está permitida." }, { status: 409 });
  }
  if (
    closedStatuses.has(nextStatus) &&
    !(parsed.data.diagnostico ?? order.diagnostico ?? "").trim()
  ) {
    return NextResponse.json(
      { error: "Registra el diagnóstico antes de avanzar a control de calidad o cerrar la orden." },
      { status: 422 },
    );
  }
  if (nextStatus === "CANCELADO" && !parsed.data.motivo?.trim()) {
    return NextResponse.json({ error: "Indica el motivo de cancelación." }, { status: 400 });
  }
  if (nextStatus === "ENTREGADO") {
    const { count, error: photoError } = await auth.supabase
      .from("fotos_vehiculo")
      .select("id", { count: "exact", head: true })
      .eq("orden_id", params.id)
      .eq("etapa", "salida");
    if (photoError) {
      console.error("No se pudieron comprobar las fotos de salida.", photoError);
      return NextResponse.json(
        { error: "No se pudieron validar las fotografías de salida." },
        { status: 500 },
      );
    }
    if (!count) {
      return NextResponse.json(
        { error: "Sube al menos una fotografía de salida antes de entregar el vehículo." },
        { status: 422 },
      );
    }
  }

  const changes: Record<string, unknown> = {
    estado: nextStatus,
    ...(parsed.data.diagnostico !== undefined
      ? { diagnostico: parsed.data.diagnostico }
      : {}),
    ...(nextStatus === "CANCELADO" && parsed.data.motivo
      ? { motivo_cancelacion: parsed.data.motivo }
      : {}),
    ...(nextStatus === "ENTREGADO" ? { fecha_entrega_real: new Date().toISOString() } : {}),
  };
  const { data, error } = await auth.supabase
    .from("ordenes_trabajo")
    .update(changes)
    .eq("id", params.id)
    .eq("estado", order.estado)
    .select("id, estado")
    .maybeSingle();
  if (error) {
    console.error("No se pudo actualizar el estado de la orden.", error);
    return NextResponse.json({ error: "No se pudo actualizar la orden." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "La orden cambió en otra sesión. Recárgala e inténtalo de nuevo." },
      { status: 409 },
    );
  }
  return NextResponse.json({ data });
}
