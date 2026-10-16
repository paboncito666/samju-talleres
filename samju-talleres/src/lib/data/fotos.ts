"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EtapaFoto, FotoVehiculo } from "@/types";

export interface SubirFotoInput {
  ordenId: string;
  etapa: EtapaFoto;
  archivo: File;
  userId: string;
}

export type ResultadoFoto =
  | { data: FotoVehiculo; error: null }
  | { data: null; error: Error };

const STORAGE_BUCKET = "fotos-vehiculos";
const fotosMockPorOrden = new Map<string, FotoVehiculo[]>();

const imagenesMock: Record<EtapaFoto, string> = {
  entrada:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23DCE6F2'/%3E%3Cpath d='M260 365h280l-35-100H315z' fill='%233B516B'/%3E%3Ccircle cx='325' cy='380' r='28' fill='%23fff'/%3E%3Ccircle cx='475' cy='380' r='28' fill='%23fff'/%3E%3Ctext x='400' y='470' text-anchor='middle' font-family='Arial' font-size='30' fill='%233B516B'%3EVeh%C3%ADculo al ingreso%3C/text%3E%3C/svg%3E",
  proceso:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23F8DCCB'/%3E%3Cpath d='M260 365h280l-35-100H315z' fill='%238A4B2A'/%3E%3Ccircle cx='325' cy='380' r='28' fill='%23fff'/%3E%3Ccircle cx='475' cy='380' r='28' fill='%23fff'/%3E%3Ctext x='400' y='470' text-anchor='middle' font-family='Arial' font-size='30' fill='%238A4B2A'%3ETrabajo en proceso%3C/text%3E%3C/svg%3E",
  salida:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23DDEBCF'/%3E%3Cpath d='M260 365h280l-35-100H315z' fill='%234A6B2E'/%3E%3Ccircle cx='325' cy='380' r='28' fill='%23fff'/%3E%3Ccircle cx='475' cy='380' r='28' fill='%23fff'/%3E%3Ctext x='400' y='470' text-anchor='middle' font-family='Arial' font-size='30' fill='%234A6B2E'%3EVeh%C3%ADculo listo%3C/text%3E%3C/svg%3E",
};

function errorDe(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Ocurrió un error al procesar la foto.");
}

function esEtapaFoto(value: string): value is EtapaFoto {
  return value === "entrada" || value === "proceso" || value === "salida";
}

export async function getFotosByOrden(
  ordenId: string,
): Promise<{ data: FotoVehiculo[]; error: Error | null }> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
    const muestras: FotoVehiculo[] = [
      {
        id: `mock-${ordenId}-entrada`,
        creado_en: "2026-10-06T08:00:00.000Z",
        orden_id: ordenId,
        url: imagenesMock.entrada,
        etapa: "entrada",
        subida_por: "mock-user",
      },
      {
        id: `mock-${ordenId}-proceso`,
        creado_en: "2026-10-06T09:00:00.000Z",
        orden_id: ordenId,
        url: imagenesMock.proceso,
        etapa: "proceso",
        subida_por: "mock-user",
      },
    ];
    const subidas = fotosMockPorOrden.get(ordenId) ?? [];
    return {
      data: [...muestras, ...subidas].sort((a, b) =>
        a.creado_en.localeCompare(b.creado_en),
      ),
      error: null,
    };
  }

  try {
    const client = createSupabaseBrowserClient();
    const { data, error } = await client
      .from("fotos_vehiculo")
      .select("*")
      .eq("orden_id", ordenId)
      .order("creado_en", { ascending: true })
      .returns<FotoVehiculo[]>();
    if (error) {
      return { data: [], error: errorDe(error) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: [], error: errorDe(error) };
  }
}

export async function subirFoto({
  ordenId,
  etapa,
  archivo,
  userId,
}: SubirFotoInput): Promise<ResultadoFoto> {
  try {
    if (!esEtapaFoto(etapa)) {
      return { data: null, error: new Error("La etapa de la foto no es válida.") };
    }
    if (!userId.trim()) {
      return { data: null, error: new Error("Debes iniciar sesión para subir fotos.") };
    }

    if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
      const foto: FotoVehiculo = {
        id: crypto.randomUUID(),
        creado_en: new Date().toISOString(),
        orden_id: ordenId,
        url: imagenesMock[etapa],
        etapa,
        subida_por: userId,
      };
      const fotos = fotosMockPorOrden.get(ordenId) ?? [];
      fotos.push(foto);
      fotosMockPorOrden.set(ordenId, fotos);
      return { data: foto, error: null };
    }

    const client = createSupabaseBrowserClient();
    const {
      data: { user },
      error: errorUsuario,
    } = await client.auth.getUser();
    if (errorUsuario) {
      return { data: null, error: errorDe(errorUsuario) };
    }
    if (!user || user.id !== userId) {
      return {
        data: null,
        error: new Error("La sesión cambió o expiró. Inicia sesión nuevamente."),
      };
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase();
    const extensionValida = extension && ["jpg", "jpeg", "png", "webp"].includes(extension);
    if (!extensionValida) {
      return {
        data: null,
        error: new Error("El archivo debe ser una imagen JPG, PNG o WebP."),
      };
    }

    const ruta = `${ordenId}/${etapa}/${crypto.randomUUID()}.${extension}`;
    const { error: errorStorage } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(ruta, archivo, {
        contentType: archivo.type,
        upsert: false,
      });
    if (errorStorage) {
      return { data: null, error: errorDe(errorStorage) };
    }

    const { data: publicUrl } = client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(ruta);
    const { data, error: errorInsert } = await client
      .from("fotos_vehiculo")
      .insert({
        orden_id: ordenId,
        url: publicUrl.publicUrl,
        etapa,
        subida_por: userId,
      })
      .select("*")
      .single<FotoVehiculo>();

    if (errorInsert) {
      const { error: errorBorrado } = await client.storage
        .from(STORAGE_BUCKET)
        .remove([ruta]);
      if (errorBorrado) {
        return {
          data: null,
          error: new Error(
            `No se pudo registrar la foto (${errorInsert.message}) ni limpiar el archivo en Storage (${errorBorrado.message}).`,
          ),
        };
      }
      return { data: null, error: errorDe(errorInsert) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: errorDe(error) };
  }
}
