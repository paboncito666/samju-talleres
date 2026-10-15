"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EtapaFoto } from "@/types";

const maxSize = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PhotoUpload({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<EtapaFoto>("entrada");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) {
      setError("Selecciona una imagen antes de subirla.");
      return;
    }
    if (!acceptedTypes.has(file.type) || file.size <= 0 || file.size > maxSize) {
      setError("Usa una imagen JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    const client = createSupabaseBrowserClient();
    let path = "";
    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      path = `${orderId}/${stage}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage
        .from("fotos-vehiculos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await client.from("fotos_vehiculo").insert({
        orden_id: orderId,
        url: `storage:fotos-vehiculos/${path}`,
        etapa: stage,
        subida_por: user.id,
      });
      if (insertError) {
        const { error: cleanupError } = await client.storage
          .from("fotos-vehiculos")
          .remove([path]);
        if (cleanupError) {
          throw new Error(
            `No se registró la foto (${insertError.message}) y no se pudo limpiar el archivo (${cleanupError.message}).`,
          );
        }
        throw insertError;
      }
      setFile(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo subir la fotografía.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold text-ink">Agregar fotografía</h2>
      <p className="mt-1 text-xs text-muted">Imágenes privadas del taller · máximo 5 MB.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="text-xs font-medium text-muted">
          Etapa
          <select className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm text-ink" value={stage} onChange={(event) => setStage(event.target.value as EtapaFoto)}>
            <option value="entrada">Entrada</option><option value="proceso">Proceso</option><option value="salida">Salida</option>
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs font-medium text-muted">
          Imagen
          <input accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm text-ink" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
        </label>
        <button className="self-end rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy || !file} onClick={upload} type="button">
          {busy ? "Subiendo..." : "Subir foto"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
