"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.error("No se pudo cerrar la sesión de Supabase.", error);
    throw new Error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
