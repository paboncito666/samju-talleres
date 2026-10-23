import { NextResponse } from "next/server";
import { authenticateApiRequest, readJsonBody } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { staffInvitationSchema } from "@/lib/validations/api";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(["admin"]);
  if (!auth.ok) return auth.response;

  const parsed = staffInvitationSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de invitación inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    console.error("No se pudo inicializar la administración de invitaciones.", error);
    return NextResponse.json(
      { error: "El servidor no está configurado para invitar personal." },
      { status: 500 },
    );
  }

  let redirectTo: string;
  try {
    redirectTo = new URL(
      "/auth/callback?next=%2Fdashboard",
      process.env.NEXT_PUBLIC_APP_URL ?? request.url,
    ).toString();
  } catch (error) {
    console.error("La URL pública de la aplicación no es válida.", error);
    return NextResponse.json(
      { error: "Configura una URL pública válida para completar la invitación." },
      { status: 500 },
    );
  }

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.nombre },
      redirectTo,
    },
  );
  if (error) {
    console.error("No se pudo invitar al nuevo miembro del personal.", error);
    return NextResponse.json(
      { error: "No se pudo enviar la invitación. Verifica el correo y la configuración de correo de Supabase." },
      { status: 400 },
    );
  }

  const { error: roleError } = await adminClient
    .from("profiles")
    .update({ rol: parsed.data.rol })
    .eq("id", data.user.id);
  if (roleError) {
    console.error("No se pudo asignar el rol a la cuenta invitada.", roleError);
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      console.error("No se pudo revertir la cuenta invitada incompleta.", cleanupError);
    }
    return NextResponse.json(
      { error: "No se pudo asignar el rol a la cuenta invitada. La invitación se revirtió; inténtalo nuevamente." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: { email: data.user.email, nombre: parsed.data.nombre } },
    { status: 201 },
  );
}
