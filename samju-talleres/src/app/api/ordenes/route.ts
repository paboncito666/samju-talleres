import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiRequest, readJsonBody, validationErrorResponse } from "@/lib/api/auth";
import { workOrderCreateSchema } from "@/lib/validations/api";

const orderReaders = ["admin", "mecanico", "recepcionista"] as const;

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(orderReaders);
  if (!auth.ok) return auth.response;

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return validationErrorResponse("El parámetro limit debe ser un entero positivo.");
  }

  let query = auth.context.supabase
    .from("ordenes_trabajo")
    .select("*")
    .limit(Math.min(requestedLimit, 100));

  if (auth.context.role === "mecanico") {
    query = query.eq("mecanico_id", auth.context.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("No se pudieron consultar las órdenes de trabajo.", error);
    return NextResponse.json(
      { error: { code: "ORDERS_QUERY_FAILED", message: "No se pudieron consultar las órdenes." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(["admin", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = workOrderCreateSchema.safeParse(body.value);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0]?.message ?? "Datos de orden inválidos.");
  }

  if (parsed.data.mecanico_id) {
    const { data: mechanic, error: mechanicError } = await auth.context.supabase
      .from("profiles")
      .select("id")
      .eq("id", parsed.data.mecanico_id)
      .eq("rol", "mecanico")
      .eq("activo", true)
      .maybeSingle();

    if (mechanicError) {
      console.error("No se pudo validar el mecánico asignado.", mechanicError);
      return NextResponse.json(
        { error: { code: "MECHANIC_LOOKUP_FAILED", message: "No se pudo validar el mecánico asignado." } },
        { status: 500 },
      );
    }

    if (!mechanic) {
      return validationErrorResponse("El mecánico asignado no existe o no tiene acceso activo.");
    }
  }

  const { data, error } = await auth.context.supabase
    .from("ordenes_trabajo")
    .insert({
      ...parsed.data,
      mecanico_id: parsed.data.mecanico_id ?? null,
      recepcionista_id: auth.context.user.id,
      estado: "Recibido",
    })
    .select("*")
    .single();

  if (error) {
    console.error("No se pudo crear la orden de trabajo.", error);
    if (error.code === "23503") {
      return NextResponse.json(
        { error: { code: "RELATED_RECORD_NOT_FOUND", message: "El vehículo o perfil relacionado no existe." } },
        { status: 422 },
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "La política de acceso no permite crear órdenes." } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: { code: "ORDER_CREATE_FAILED", message: "No se pudo crear la orden de trabajo." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
