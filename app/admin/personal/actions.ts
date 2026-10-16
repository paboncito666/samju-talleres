"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const assignableRoles = ["mecanico", "recepcionista"] as const;

function isAssignableRole(role: string): role is (typeof assignableRoles)[number] {
  return assignableRoles.some((assignableRole) => assignableRole === role);
}

export async function updateStaffRole(formData: FormData) {
  const profileId = formData.get("profileId");
  const role = formData.get("role");
  if (
    typeof profileId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId) ||
    typeof role !== "string" ||
    !isAssignableRole(role)
  ) {
    throw new Error("La cuenta o el rol seleccionado no son válidos.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("No se pudo validar la sesión al asignar un rol.", userError);
    throw new Error("Inicia sesión como administrador para asignar roles.");
  }

  const { error } = await supabase.rpc("assign_staff_role", {
    target_profile_id: profileId,
    new_role: role,
  });
  if (error) {
    console.error("No se pudo asignar el rol al perfil.", error);
    throw new Error("No se pudo cambiar el rol. Verifica que tengas permisos de administrador.");
  }

  revalidatePath("/admin/personal");
  revalidatePath("/dashboard");
  revalidatePath("/vehiculos");
  redirect("/admin/personal?actualizado=1");
}
