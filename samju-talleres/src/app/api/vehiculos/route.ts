import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiRequest, readJsonBody, validationErrorResponse } from "@/lib/api/auth";
import { vehicleCreateSchema } from "@/lib/validations/api";

const vehicleReaders = ["admin", "recepcionista"] as const;

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(vehicleReaders);
  if (!auth.ok) return auth.response;

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return validationErrorResponse("El parámetro limit debe ser un entero positivo.");
  }

  const { data, error } = await auth.context.supabase
    .from("vehiculos")
    .select("*")
    .limit(Math.min(requestedLimit, 100));

  if (error) {
    console.error("No se pudieron consultar los vehículos.", error);
    return NextResponse.json(
      { error: { code: "VEHICLES_QUERY_FAILED", message: "No se pudieron consultar los vehículos." } },
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

  const parsed = vehicleCreateSchema.safeParse(body.value);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0]?.message ?? "Datos de vehículo inválidos.");
  }

  const { data, error } = await auth.context.supabase
    .from("vehiculos")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: { code: "PLATE_ALREADY_EXISTS", message: "Ya existe un vehículo con esa placa." } },
        { status: 409 },
      );
    }

    console.error("No se pudo crear el vehículo.", error);
    if (error.code === "42501") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "La política de acceso no permite crear vehículos." } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: { code: "VEHICLE_CREATE_FAILED", message: "No se pudo crear el vehículo." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
