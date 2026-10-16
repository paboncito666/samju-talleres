import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { vehicleCreateSchema } from "@/lib/validations/api";

const vehicleStaff = ["admin", "recepcionista"] as const;

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(["admin", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const limitValue = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isSafeInteger(limitValue)
    ? Math.min(Math.max(limitValue, 1), 100)
    : 50;

  let requestQuery = auth.supabase
    .from("vehiculos")
    .select(
      "id, placa, marca, modelo, anio, color, kilometraje, propietario_nombre, propietario_telefono",
    )
    .order("placa", { ascending: true })
    .limit(limit);
  if (query) {
    const pattern = query.replace(/[%_,]/g, "");
    requestQuery = requestQuery.or(
      `placa.ilike.%${pattern}%,propietario_nombre.ilike.%${pattern}%`,
    );
  }

  const { data, error } = await requestQuery;
  if (error) {
    console.error("No se pudieron consultar los vehículos.", error);
    return NextResponse.json({ error: "No se pudieron cargar los vehículos." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(vehicleStaff);
  if (!auth.ok) return auth.response;

  const parsed = vehicleCreateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de vehículo inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { data, error } = await auth.supabase
    .from("vehiculos")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) {
    console.error("No se pudo crear el vehículo.", error);
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "Ya existe un vehículo con esa placa." : "No se pudo crear el vehículo." },
      { status },
    );
  }
  return NextResponse.json({ data }, { status: 201 });
}
