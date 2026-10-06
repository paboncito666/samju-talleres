"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SignOutState {
  error?: string;
}

export async function signOutAction(
  previousState: SignOutState,
): Promise<SignOutState> {
  void previousState;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    console.error("No se pudo cerrar la sesión de Supabase.", error);
    return { error: "No se pudo cerrar la sesión. Inténtalo de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
