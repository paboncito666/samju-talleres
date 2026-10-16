"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RealtimeRefresher({
  tables,
  filter,
}: {
  tables: string[];
  filter?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    let channel: ReturnType<typeof client.channel> | undefined;
    let cancelled = false;

    async function subscribe() {
      const { data, error } = await client.auth.getSession();
      if (error) {
        console.error("No se pudo obtener la sesión para Realtime.", error);
        return;
      }
      if (cancelled) return;
      if (!data.session) {
        console.error("No hay una sesión activa para suscribirse a Realtime.");
        return;
      }

      client.realtime.setAuth(data.session.access_token);
      channel = client.channel(`samju-${tables.join("-")}-${filter ?? "all"}`);
      for (const table of tables) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
          () => router.refresh(),
        );
      }
      channel.subscribe((status, subscriptionError) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            `Falló la suscripción Realtime para ${tables.join(", ")}: ${status}`,
            subscriptionError,
          );
        }
      });
    }

    void subscribe();
    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
    };
  }, [filter, router, tables]);

  return <span className="sr-only" aria-live="polite">Sincronización en tiempo real activa</span>;
}
