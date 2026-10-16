import { NextResponse } from "next/server";
import type { ProfileRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApiAuthResult =
  | {
      ok: true;
      userId: string;
      role: ProfileRole;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    }
  | { ok: false; response: NextResponse };

export async function authenticateApiRequest(
  allowedRoles: readonly ProfileRole[],
): Promise<ApiAuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("No se pudo verificar la sesión de la API.", authError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No se pudo verificar la sesión." },
        { status: 401 },
      ),
    };
  }
  if (!user || authError?.name === "AuthSessionMissingError") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Autenticación requerida." }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("No se pudo verificar el perfil de la API.", profileError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No se pudo verificar el perfil." },
        { status: 500 },
      ),
    };
  }
  if (
    !profile ||
    profile.activo !== true ||
    !allowedRoles.includes(profile.rol as ProfileRole)
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acceso denegado." }, { status: 403 }),
    };
  }

  return {
    ok: true,
    userId: user.id,
    role: profile.rol as ProfileRole,
    supabase,
  };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
