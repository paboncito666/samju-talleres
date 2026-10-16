import { createSupabaseServerClient } from "@/lib/supabase/server";

const STORAGE_PREFIX = "storage:fotos-vehiculos/";

export async function resolveVehiclePhotoUrls<
  T extends { url: string },
>(photos: T[]): Promise<T[]> {
  const supabase = await createSupabaseServerClient();
  return Promise.all(
    photos.map(async (photo) => {
      if (!photo.url.startsWith(STORAGE_PREFIX)) return photo;
      const path = photo.url.slice(STORAGE_PREFIX.length);
      const { data, error } = await supabase.storage
        .from("fotos-vehiculos")
        .createSignedUrl(path, 60 * 60);
      if (error) {
        console.error("No se pudo generar URL temporal para una fotografía.", error);
        return { ...photo, url: "" };
      }
      return { ...photo, url: data.signedUrl };
    }),
  );
}
