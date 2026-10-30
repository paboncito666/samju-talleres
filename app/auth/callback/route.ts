import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isProfileRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedDestination = safeReturnPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("No se pudo completar el callback de autenticación.", error);
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("No se pudo cargar el usuario después del callback.", userError);
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }
    if (user.user_metadata?.force_password_setup === true) {
      return NextResponse.redirect(
        new URL("/ajustes/establecer-contrasena", request.url),
      );
    }

    let profile: { rol: string; activo: boolean } | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("rol, activo")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error("No se pudo consultar el perfil después del callback.", profileError);
        return NextResponse.redirect(new URL("/forbidden", request.url));
      }
      if (data) {
        profile = data;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (!profile || !profile.activo || !isProfileRole(profile.rol)) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }

    const destination = canAccessPath(profile.rol, requestedDestination)
      ? requestedDestination
      : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const confirmationUrl = new URL(
    `/auth/callback/complete${request.nextUrl.search}`,
    request.url,
  );
  return NextResponse.redirect(confirmationUrl);
}
