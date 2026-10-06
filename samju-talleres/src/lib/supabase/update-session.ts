import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isProfileRole } from "@/lib/auth/permissions";

export async function updateSupabaseSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para conectar con Supabase.",
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("No se pudo verificar la sesión de Supabase.", authError);
    return redirectWithCookies(request, response, "/login");
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return redirectWithCookies(request, response, loginUrl);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("No se pudo verificar el perfil del usuario.", profileError);
    return redirectWithCookies(request, response, "/forbidden");
  }

  if (!profile || profile.activo !== true || !isProfileRole(profile.rol)) {
    return redirectWithCookies(request, response, "/forbidden");
  }

  if (!canAccessPath(profile.rol, request.nextUrl.pathname)) {
    return redirectWithCookies(request, response, "/forbidden");
  }

  return response;
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  destination: string | URL,
): NextResponse {
  const redirectResponse = NextResponse.redirect(
    destination instanceof URL ? destination : new URL(destination, request.url),
  );

  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
