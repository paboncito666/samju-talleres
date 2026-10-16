"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateProfileName(formData: FormData) {
  const nombre = formData.get("nombre");
  if (typeof nombre !== "string" || nombre.trim().length < 2 || nombre.trim().length > 80) {
    redirect("/dashboard?profileNameError=nombre");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("No se pudo validar la sesión al actualizar el nombre.", userError);
    redirect("/login");
  }

  const { error } = await supabase.rpc("confirm_own_profile_name", {
    new_name: nombre.trim(),
  });
  if (error) {
    console.error("No se pudo actualizar el nombre del perfil.", error);
    redirect("/dashboard?profileNameError=guardar");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?profileNameUpdated=1");
}
