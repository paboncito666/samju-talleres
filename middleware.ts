import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isProfileRole } from "@/lib/auth/permissions";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
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
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("No se pudo verificar la sesión.", authError);
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
    console.error("No se pudo consultar el perfil.", profileError);
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
) {
  const result = NextResponse.redirect(
    destination instanceof URL ? destination : new URL(destination, request.url),
  );
  for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
  return result;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/ajustes/:path*",
    "/dashboard/:path*",
    "/vehiculos/:path*",
    "/ordenes/:path*",
    "/historial/:path*",
  ],
};
