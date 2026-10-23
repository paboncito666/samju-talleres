import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { workItemCreateSchema } from "@/lib/validations/api";

type RouteContext = { params: { id: string } };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authenticateApiRequest(["admin", "mecanico", "recepcionista"]);
  if (!auth.ok) return auth.response;

  const parsed = workItemCreateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos del trabajo inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: order, error: orderError } = await auth.supabase
    .from("ordenes_trabajo")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (orderError) {
    console.error("No se pudo verificar la orden para agregar un trabajo.", orderError);
    return NextResponse.json({ error: "No se pudo consultar la orden." }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Orden no encontrada o sin acceso." }, { status: 404 });

  const { data, error } = await auth.supabase
    .from("trabajos_realizados")
    .insert({ ...parsed.data, orden_id: params.id })
    .select("id, orden_id, descripcion, tipo, completado, creado_en")
    .single();
  if (error) {
    console.error("No se pudo agregar el trabajo a la orden.", error);
    return NextResponse.json({ error: "No se pudo agregar el trabajo." }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
