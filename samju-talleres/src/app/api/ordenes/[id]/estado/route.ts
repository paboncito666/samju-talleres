import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiRequest, readJsonBody, validationErrorResponse } from "@/lib/api/auth";
import {
  workOrderStatusSchema,
  workOrderStatusTransitions,
  type WorkOrderStatus,
} from "@/lib/validations/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticateApiRequest(["admin", "mecanico", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return validationErrorResponse("El identificador de la orden no es válido.");
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = workOrderStatusSchema.safeParse(body.value);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0]?.message ?? "Estado inválido.");
  }

  const { data: order, error: orderError } = await auth.context.supabase
    .from("ordenes_trabajo")
    .select("id, mecanico_id, estado")
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    console.error("No se pudo consultar la orden para cambiar su estado.", orderError);
    return NextResponse.json(
      { error: { code: "ORDER_QUERY_FAILED", message: "No se pudo consultar la orden." } },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: { code: "ORDER_NOT_FOUND", message: "La orden no existe." } },
      { status: 404 },
    );
  }

  if (
    auth.context.role === "mecanico" &&
    order.mecanico_id !== auth.context.user.id
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Solo puedes cambiar órdenes asignadas a ti." } },
      { status: 403 },
    );
  }

  if (
    typeof order.estado !== "string" ||
    !(order.estado in workOrderStatusTransitions)
  ) {
    console.error("La orden tiene un estado desconocido.", {
      orderId: order.id,
      estado: order.estado,
    });
    return NextResponse.json(
      { error: { code: "INVALID_CURRENT_STATUS", message: "La orden tiene un estado inválido." } },
      { status: 409 },
    );
  }

  const currentStatus = order.estado as WorkOrderStatus;
  if (!workOrderStatusTransitions[currentStatus].includes(parsed.data.estado)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `No se permite cambiar de "${currentStatus}" a "${parsed.data.estado}".`,
        },
      },
      { status: 409 },
    );
  }

  const { data: updatedOrder, error: updateError } = await auth.context.supabase
    .from("ordenes_trabajo")
    .update({ estado: parsed.data.estado })
    .eq("id", id)
    .eq("estado", currentStatus)
    .select("id, estado")
    .maybeSingle();

  if (updateError) {
    console.error("No se pudo cambiar el estado de la orden.", updateError);
    if (updateError.code === "42501") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "La política de acceso no permite cambiar el estado." } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: { code: "ORDER_STATUS_UPDATE_FAILED", message: "No se pudo cambiar el estado." } },
      { status: 500 },
    );
  }

  if (!updatedOrder) {
    return NextResponse.json(
      {
        error: {
          code: "ORDER_STATUS_CONFLICT",
          message: "La orden cambió en paralelo. Recarga e inténtalo de nuevo.",
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ data: updatedOrder });
}
