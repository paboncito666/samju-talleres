import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isProfileRole, type ProfileRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApiAuthContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User;
  role: ProfileRole;
};

export type ApiAuthResult =
  | { ok: true; context: ApiAuthContext }
  | { ok: false; response: NextResponse };

export async function authenticateApiRequest(
  allowedRoles: readonly ProfileRole[],
): Promise<ApiAuthResult> {
  let supabase: ApiAuthContext["supabase"];

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error("No se pudo inicializar el cliente de Supabase para la API.", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "SERVICE_UNAVAILABLE", message: "El servicio no está configurado." } },
        { status: 503 },
      ),
    };
  }

  let authResult: Awaited<ReturnType<typeof supabase.auth.getUser>>;

  try {
    authResult = await supabase.auth.getUser();
  } catch (error) {
    console.error("No se pudo verificar la sesión para la API.", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "AUTH_UNAVAILABLE", message: "No se pudo verificar la sesión." } },
        { status: 503 },
      ),
    };
  }

  if (authResult.error) {
    console.error("Error al consultar la sesión de Supabase.", authResult.error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "AUTH_UNAVAILABLE", message: "No se pudo verificar la sesión." } },
        { status: 503 },
      ),
    };
  }

  const user = authResult.data.user;
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Debes iniciar sesión." } },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error al consultar el perfil para la API.", profileError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "PROFILE_UNAVAILABLE", message: "No se pudo verificar el perfil." } },
        { status: 503 },
      ),
    };
  }

  if (!profile || profile.activo !== true || !isProfileRole(profile.rol)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Tu perfil no tiene acceso activo." } },
        { status: 403 },
      ),
    };
  }

  if (!allowedRoles.includes(profile.rol)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "No tienes permiso para esta operación." } },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: { supabase, user, role: profile.rol },
  };
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "INVALID_JSON", message: "El cuerpo debe ser JSON válido." } },
        { status: 400 },
      ),
    };
  }
}

export function validationErrorResponse(message: string): NextResponse {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message } },
    { status: 400 },
  );
}
