import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import {
  workOrderStatuses,
  workOrderStatusSchema,
  workOrderStatusTransitions,
} from "@/lib/validations/api";
import { canTransitionOrder } from "@/lib/ordenes/workflow";

type RouteContext = { params: Promise<{ id: string }> };
const diagnosisRequiredStatuses = new Set([
  "PENDIENTE",
  "CALIDAD",
  "LISTO",
  "ENTREGADO",
]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
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
    .eq("id", id)
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
  const currentStatus = workOrderStatuses.find(
    (status) => status === order.estado,
  );
  if (!currentStatus) {
    return NextResponse.json(
      { error: "La orden tiene un estado no reconocido." },
      { status: 409 },
    );
  }
  if (!canTransitionOrder(auth.role, currentStatus, nextStatus)) {
    const graphAllowsTransition =
      workOrderStatusTransitions[currentStatus].includes(nextStatus);
    return NextResponse.json(
      {
        error: graphAllowsTransition
          ? "Tu rol no tiene permiso para realizar este cambio de estado."
          : "La transición de estado no está permitida.",
      },
      { status: graphAllowsTransition ? 403 : 409 },
    );
  }
  if (
    diagnosisRequiredStatuses.has(nextStatus) &&
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
      .eq("orden_id", id)
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
    .eq("id", id)
    .eq("estado", order.estado)
    .select("id, estado")
    .maybeSingle();
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Tu rol no tiene permiso para realizar este cambio de estado." },
        { status: 403 },
      );
    }
    if (error.code === "23514") {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.message.toLowerCase().includes("transición") ? 409 : 422,
        },
      );
    }
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
