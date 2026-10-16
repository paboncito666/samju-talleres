import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth/return-path";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeReturnPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nombre_confirmado")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || !profile) {
        console.error(
          "No se pudo consultar el perfil después de autenticar.",
          profileError ?? new Error("No existe un perfil para la cuenta autenticada."),
        );
        return NextResponse.redirect(new URL("/login?error=oauth", request.url));
      }
      if (profile.nombre_confirmado) {
        return NextResponse.redirect(new URL(destination, request.url));
      }
      const completeProfileUrl = new URL("/completar-perfil", request.url);
      completeProfileUrl.searchParams.set("next", destination);
      return NextResponse.redirect(completeProfileUrl);
    }
    if (error) {
      console.error("No se pudo completar el callback de autenticación.", error);
    } else {
      console.error(
        "No se recibió una cuenta al completar el callback de autenticación.",
      );
    }
  }
  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
