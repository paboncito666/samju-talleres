import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { workOrderCreateSchema } from "@/lib/validations/api";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(["admin", "mecanico", "recepcionista"]);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isSafeInteger(limitValue)
    ? Math.min(Math.max(limitValue, 1), 100)
    : 50;

  let query = auth.supabase
    .from("ordenes_trabajo")
    .select(
      "id, vehiculo_id, mecanico_id, estado, descripcion_trabajo, tipo_servicio, fecha_ingreso, fecha_estimada_entrega, vehiculos(placa, marca, modelo, propietario_nombre)",
    )
    .order("fecha_ingreso", { ascending: false })
    .limit(limit);
  if (auth.role === "mecanico") query = query.eq("mecanico_id", auth.userId);

  const { data, error } = await query;
  if (error) {
    console.error("No se pudieron consultar las órdenes.", error);
    return NextResponse.json({ error: "No se pudieron cargar las órdenes." }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(["admin", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const parsed = workOrderCreateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de orden inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { data, error } = await auth.supabase
    .from("ordenes_trabajo")
    .insert({
      ...parsed.data,
      recepcionista_id: auth.userId,
      estado: "RECIBIDO",
    })
    .select("id")
    .single();
  if (error) {
    console.error("No se pudo crear la orden.", error);
    return NextResponse.json({ error: "No se pudo crear la orden." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
