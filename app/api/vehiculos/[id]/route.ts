import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { vehicleUpdateSchema } from "@/lib/validations/api";

type RouteContext = { params: { id: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const parsed = vehicleUpdateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de vehículo inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("vehiculos")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id, placa, marca, modelo, anio, color, kilometraje, propietario_nombre, propietario_telefono")
    .maybeSingle();

  if (error) {
    console.error("No se pudo actualizar el vehículo.", error);
    return NextResponse.json(
      { error: error.code === "23505" ? "Ya existe un vehículo con esa placa." : "No se pudo actualizar el vehículo." },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });

  return NextResponse.json({ data });
}
