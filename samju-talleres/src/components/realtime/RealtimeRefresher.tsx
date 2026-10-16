"use client";

import { useCallback, useEffect, useState } from "react";
import { ESTADOS, type EstadoOrden } from "@/lib/estados";
import { USE_MOCKS } from "@/lib/data/config";
import {
  useRealtimeRefresh,
  type RealtimeTable,
} from "@/hooks/useRealtimeRefresh";
import { EstadoConexion } from "@/components/realtime/EstadoConexion";

export interface RealtimeRefresherProps {
  tables: RealtimeTable[];
  filter?: string;
  ordenId?: string;
}

const nombresEstado = new Map(
  Object.entries(ESTADOS).map(([estado, datos]) => [estado, datos.label]),
);

function estadoDeEvento(payload: unknown): EstadoOrden | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("new" in payload) ||
    typeof payload.new !== "object" ||
    payload.new === null ||
    !("estado" in payload.new) ||
    typeof payload.new.estado !== "string"
  ) {
    return null;
  }

  return nombresEstado.has(payload.new.estado)
    ? (payload.new.estado as EstadoOrden)
    : null;
}

export function RealtimeRefresher({
  tables,
  filter,
  ordenId,
}: RealtimeRefresherProps) {
  const [estadoActualizado, setEstadoActualizado] = useState<string | null>(
    null,
  );
  const [tokenAviso, setTokenAviso] = useState(0);

  const onChange = useCallback(
    (tabla: string, payload: unknown) => {
      if (tabla !== "ordenes_trabajo" || !ordenId) return;
      const estado = estadoDeEvento(payload);
      if (!estado) return;
      const nombre = nombresEstado.get(estado);
      if (!nombre) return;
      setEstadoActualizado(`Estado actualizado a ${nombre}`);
      setTokenAviso((token) => token + 1);
    },
    [ordenId],
  );

  const tablas = tables.map((table) => ({
    ...table,
    filter: table.filter ?? filter,
  }));

  const estado = useRealtimeRefresh({
    tables: tablas,
    enabled: !USE_MOCKS,
    onChange,
  });

  return (
    <>
      <EstadoConexion estado={estado} />
      {estadoActualizado && (
        <AvisoEstadoActualizado
          key={tokenAviso}
          mensaje={estadoActualizado}
          onOcultar={() => setEstadoActualizado(null)}
        />
      )}
    </>
  );
}

function AvisoEstadoActualizado({
  mensaje,
  onOcultar,
}: {
  mensaje: string;
  onOcultar: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onOcultar, 5000);
    return () => window.clearTimeout(timeout);
  }, [onOcultar]);

  return (
    <span
      role="status"
      className="inline-flex items-center rounded-full bg-estado-calidad px-2.5 py-1 text-xs font-medium text-estado-calidad-text"
    >
      {mensaje}
    </span>
  );
}
