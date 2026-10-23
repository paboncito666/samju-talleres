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
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (files.length === 0) {
      setError("Selecciona al menos una imagen antes de subirla.");
      return;
    }
    if (files.length > 6) {
      setError("Puedes subir hasta 6 fotografías por lote.");
      return;
    }
    const invalidFile = files.find(
      (file) => !acceptedTypes.has(file.type) || file.size <= 0 || file.size > maxSize,
    );
    if (invalidFile) {
      setError(`"${invalidFile.name}" no es válido. Usa imágenes JPG, PNG o WebP de hasta 5 MB.`);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const client = createSupabaseBrowserClient();
    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");

      const failures: string[] = [];
      const failedFiles: File[] = [];
      let uploaded = 0;
      for (const file of files) {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `${orderId}/${stage}/${crypto.randomUUID()}.${extension}`;
        let fileUploaded = false;
        try {
          const { error: uploadError } = await client.storage
            .from("fotos-vehiculos")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          fileUploaded = true;

          const { error: insertError } = await client.from("fotos_vehiculo").insert({
            orden_id: orderId,
            url: `storage:fotos-vehiculos/${path}`,
            etapa: stage,
            subida_por: user.id,
          });
          if (insertError) throw insertError;
          uploaded += 1;
        } catch (cause) {
          let cleanupMessage = "";
          if (fileUploaded) {
            try {
              const { error: cleanupError } = await client.storage
                .from("fotos-vehiculos")
                .remove([path]);
              if (cleanupError) cleanupMessage = ` No se pudo limpiar el archivo: ${cleanupError.message}.`;
            } catch (cleanupCause) {
              const reason = cleanupCause instanceof Error
                ? cleanupCause.message
                : "Error inesperado.";
              cleanupMessage = ` No se pudo limpiar el archivo: ${reason}.`;
            }
          }
          const reason = cause instanceof Error ? cause.message : "Error inesperado.";
          failures.push(`${file.name}: ${reason}.${cleanupMessage}`);
          failedFiles.push(file);
        }
      }

      if (uploaded) {
        setFiles(failedFiles);
        setNotice(`${uploaded} ${uploaded === 1 ? "fotografía subida" : "fotografías subidas"} correctamente.`);
        router.refresh();
      }
      if (failures.length) {
        setError(`No se pudieron subir ${failures.length} fotografías: ${failures.join("; ")}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo subir la fotografía.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="text-sm font-semibold text-ink">Agregar fotografía</h2>
      <p className="mt-1 text-xs text-muted">Imágenes privadas · JPG, PNG o WebP · hasta 6 por lote y 5 MB cada una.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="text-xs font-medium text-muted">
          Etapa
          <select className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm text-ink" disabled={busy} value={stage} onChange={(event) => setStage(event.target.value as EtapaFoto)}>
            <option value="entrada">Entrada</option><option value="proceso">Proceso</option><option value="salida">Salida</option>
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs font-medium text-muted">
          Imagen
          <input accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm text-ink" disabled={busy} multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; setError(""); setNotice(""); }} type="file" />
        </label>
        <button className="self-end rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy || !files.length} onClick={upload} type="button">
          {busy ? "Subiendo..." : "Subir fotografías"}
        </button>
      </div>
      {files.length > 0 && <p className="mt-2 text-xs text-muted">{files.length} archivos seleccionados.</p>}
      {notice && <p className="mt-3 text-sm text-sage-foreground" role="status">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  );
}
