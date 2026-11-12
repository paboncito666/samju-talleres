"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Trash2, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const maxSize = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const storagePrefix = "storage:fotos-vehiculos/";

function getStoragePath(reference: string | null) {
  return reference?.startsWith(storagePrefix)
    ? reference.slice(storagePrefix.length)
    : null;
}

export function VehiclePhotoManager({
  vehicleId,
  vehicleName,
  photoPath,
  photoUrl,
}: {
  vehicleId: string;
  vehicleName: string;
  photoPath: string | null;
  photoUrl: string;
}) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState(photoUrl);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function savePhoto() {
    if (!selectedFile) {
      setError("Selecciona una imagen antes de guardarla.");
      return;
    }
    if (!acceptedTypes.has(selectedFile.type) || selectedFile.size <= 0 || selectedFile.size > maxSize) {
      setError("La imagen debe ser JPG, PNG o WebP y no superar 5 MB.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    let uploadedPath: string | null = null;
    let saved = false;
    try {
      const client = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");

      const extension = selectedFile.type === "image/jpeg" ? "jpg" : selectedFile.type.split("/")[1];
      uploadedPath = `vehiculos/${vehicleId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage
        .from("fotos-vehiculos")
        .upload(uploadedPath, selectedFile, { contentType: selectedFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const newPhotoPath = `${storagePrefix}${uploadedPath}`;
      const { data, error: updateError } = await client
        .from("vehiculos")
        .update({ foto_url: newPhotoPath })
        .eq("id", vehicleId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("No se pudo actualizar el vehículo. Verifica tus permisos.");
      saved = true;

      const oldStoragePath = getStoragePath(photoPath);
      if (oldStoragePath && oldStoragePath !== uploadedPath) {
        const { error: removeError } = await client.storage
          .from("fotos-vehiculos")
          .remove([oldStoragePath]);
        if (removeError) {
          setError(`La foto se actualizó, pero no se pudo eliminar la anterior: ${removeError.message}`);
        }
      }

      const { data: signedPhoto, error: signedUrlError } = await client.storage
        .from("fotos-vehiculos")
        .createSignedUrl(uploadedPath, 60 * 60);
      if (signedUrlError) {
        console.error("La foto del vehículo se guardó, pero no se pudo mostrar de inmediato.", signedUrlError);
        setDisplayPhotoUrl("");
      } else {
        setDisplayPhotoUrl(signedPhoto.signedUrl);
      }
      setSelectedFile(null);
      setNotice("La fotografía del vehículo se guardó.");
      router.refresh();
    } catch (cause) {
      let cleanupMessage = "";
      if (uploadedPath && !saved) {
        try {
          const { error: cleanupError } = await createSupabaseBrowserClient()
            .storage.from("fotos-vehiculos").remove([uploadedPath]);
          if (cleanupError) cleanupMessage = ` No se pudo limpiar el archivo subido: ${cleanupError.message}`;
        } catch (cleanupCause) {
          const reason = cleanupCause instanceof Error ? cleanupCause.message : "Error inesperado.";
          cleanupMessage = ` No se pudo limpiar el archivo subido: ${reason}`;
        }
      }
      const reason = cause instanceof Error ? cause.message : "Error inesperado.";
      setError(`No se pudo guardar la fotografía: ${reason}.${cleanupMessage}`);
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    const oldStoragePath = getStoragePath(photoPath);
    if (!oldStoragePath) {
      setError("No se pudo identificar la fotografía guardada.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const client = createSupabaseBrowserClient();
      const { data, error: updateError } = await client
        .from("vehiculos")
        .update({ foto_url: null })
        .eq("id", vehicleId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("No se pudo actualizar el vehículo. Verifica tus permisos.");

      const { error: removeError } = await client.storage
        .from("fotos-vehiculos")
        .remove([oldStoragePath]);
      setDisplayPhotoUrl("");
      setNotice(removeError
        ? `La foto se quitó del vehículo, pero no se pudo eliminar el archivo: ${removeError.message}`
        : "La fotografía se quitó del vehículo.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo quitar la fotografía.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-soft sm:grid-cols-[minmax(0,1fr)_minmax(16rem,1.2fr)] sm:items-center">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-mist">
        {displayPhotoUrl ? (
          <Image
            alt={`Fotografía de ${vehicleName}`}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 100vw, 40vw"
            src={displayPhotoUrl}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <Camera aria-hidden="true" className="size-10" />
            <span className="sr-only">Este vehículo todavía no tiene una foto.</span>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-ink">Foto del vehículo</h2>
        <p className="mt-1 text-sm text-muted">
          Agrega una imagen para identificarlo fácilmente en la flota. JPG, PNG o WebP, hasta 5 MB.
        </p>
        <div className="mt-4">
          <label
            className={`inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-background px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-sage hover:bg-mist focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40 ${busy ? "pointer-events-none opacity-60" : ""}`}
            htmlFor={`vehicle-photo-${vehicleId}`}
          >
            <Upload aria-hidden="true" className="size-4 text-primary" />
            {selectedFile ? "Elegir otra imagen" : "Seleccionar imagen"}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            id={`vehicle-photo-${vehicleId}`}
            onChange={(event) => {
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              setError("");
              setNotice("");
            }}
            type="file"
          />
          {selectedFile && (
            <p className="mt-2 max-w-full truncate text-xs text-muted" title={selectedFile.name}>
              Seleccionada: {selectedFile.name}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none"
            disabled={busy || !selectedFile}
            onClick={savePhoto}
            type="button"
          >
            {busy ? (
              <>
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Guardando...
              </>
            ) : (
              <>
                <Check aria-hidden="true" className="size-4" />
                {photoPath ? "Guardar cambios" : "Guardar foto"}
              </>
            )}
          </button>
          {photoPath && (
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              disabled={busy}
              onClick={removePhoto}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" /> Quitar foto
            </button>
          )}
        </div>
        {notice && <p className="mt-3 text-sm text-sage-foreground" role="status">{notice}</p>}
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      </div>
    </section>
  );
}
