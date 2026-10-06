import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, origin: string): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return "/dashboard";
  }

  const target = new URL(value, origin);
  return target.origin === origin
    ? `${target.pathname}${target.search}${target.hash}`
    : "/dashboard";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(
    requestUrl.searchParams.get("next"),
    requestUrl.origin,
  );

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl));
}
