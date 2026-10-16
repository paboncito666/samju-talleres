"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/auth/return-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeProfileAction(formData: FormData) {
  const nextValue = formData.get("next");
  const destination = safeReturnPath(typeof nextValue === "string" ? nextValue : null);
  const nombre = formData.get("nombre");
  if (typeof nombre !== "string" || nombre.trim().length < 2 || nombre.trim().length > 80) {
    redirect(`/completar-perfil?error=nombre&next=${encodeURIComponent(destination)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("No se pudo validar la sesión al completar el perfil.", userError);
    redirect("/login");
  }

  const { error } = await supabase.rpc("confirm_own_profile_name", {
    new_name: nombre.trim(),
  });
  if (error) {
    console.error(
      "No se pudo guardar el nombre del perfil.",
      error,
    );
    redirect(`/completar-perfil?error=guardar&next=${encodeURIComponent(destination)}`);
  }

  revalidatePath("/", "layout");
  redirect(destination);
}
