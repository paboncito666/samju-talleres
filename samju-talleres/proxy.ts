import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vehiculos/:path*",
    "/ordenes/:path*",
    "/historial/:path*",
  ],
};
