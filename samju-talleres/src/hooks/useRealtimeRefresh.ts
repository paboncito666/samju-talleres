"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface RealtimeTable {
  table: string;
  filter?: string;
}

export type EstadoRealtime = "conectado" | "reconectando" | "deshabilitado";

export interface UseRealtimeRefreshOptions {
  tables: RealtimeTable[];
  enabled?: boolean;
  debounceMs?: number;
  onChange?: (tabla: string, payload: unknown) => void;
}

export function useRealtimeRefresh({
  tables,
  enabled = true,
  debounceMs = 300,
  onChange,
}: UseRealtimeRefreshOptions): EstadoRealtime {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoRealtime>(
    enabled ? "reconectando" : "deshabilitado",
  );
  const tablesKey = tables
    .map(({ table, filter }) => `${table}:${filter ?? ""}`)
    .join("|");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let activo = true;
    let refresco: ReturnType<typeof setTimeout> | undefined;
    let canal: RealtimeChannel | undefined;

    try {
      const supabase = createSupabaseBrowserClient();
      canal = supabase.channel(
        `realtime-refresh-${crypto.randomUUID()}`,
      );

      for (const { table, filter } of tables) {
        canal.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(filter ? { filter } : {}),
          },
          (payload) => {
            if (!activo) return;
            onChange?.(table, payload);
            if (refresco) clearTimeout(refresco);
            refresco = setTimeout(() => {
              if (activo) router.refresh();
            }, debounceMs);
          },
        );
      }

      canal.subscribe((status, error) => {
        if (!activo) return;
        if (status === "SUBSCRIBED") {
          setEstado("conectado");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Error en la suscripción de Supabase Realtime:", error);
        }
        setEstado("reconectando");
      });
    } catch (error) {
      console.error("No se pudo iniciar Supabase Realtime:", error);
    }

    return () => {
      activo = false;
      if (refresco) clearTimeout(refresco);
      if (canal) {
        try {
          void createSupabaseBrowserClient()
            .removeChannel(canal)
            .catch((error: unknown) => {
              console.error("No se pudo limpiar el canal Realtime:", error);
            });
        } catch (error) {
          console.error("No se pudo limpiar el canal Realtime:", error);
        }
      }
    };
    // La clave estableiza las suscripciones al contenido de tablas y filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tablesKey, debounceMs, router, onChange]);

  return enabled ? estado : "deshabilitado";
}
