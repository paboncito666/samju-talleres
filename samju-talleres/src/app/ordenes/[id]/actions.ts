"use server";

import { revalidatePath } from "next/cache";
import { cambiarEstado } from "@/lib/data/ordenes";
import type { EstadoOrden } from "@/lib/estados";

export async function cambiarEstadoOrdenAction(
  ordenId: string,
  nuevoEstado: EstadoOrden,
  motivo?: string,
): Promise<{ error: string | null }> {
  const resultado = await cambiarEstado(ordenId, nuevoEstado, motivo);
  if (resultado.error) {
    return { error: resultado.error.message };
  }

  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/dashboard");
  revalidatePath("/vehiculos");
  return { error: null };
}
