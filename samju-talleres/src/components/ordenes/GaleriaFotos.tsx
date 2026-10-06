"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { getFotosByOrden } from "@/lib/data/fotos";
import type { EtapaFoto, FotoVehiculo } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Modal, Skeleton } from "@/components/ui";
import { SubirFotos } from "@/components/ordenes/SubirFotos";

const etapas: { valor: EtapaFoto; etiqueta: string }[] = [
  { valor: "entrada", etiqueta: "Entrada" },
  { valor: "proceso", etiqueta: "En proceso" },
  { valor: "salida", etiqueta: "Salida" },
];

export interface GaleriaFotosProps {
  ordenId: string;
}

export function GaleriaFotos({ ordenId }: GaleriaFotosProps) {
  const [fotos, setFotos] = useState<FotoVehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fotoActual, setFotoActual] = useState<number | null>(null);

  useEffect(() => {
    let activa = true;
    void getFotosByOrden(ordenId).then((resultado) => {
      if (!activa) return;
      setFotos(resultado.data);
      setError(resultado.error?.message ?? null);
      setCargando(false);
    });
    return () => {
      activa = false;
    };
  }, [ordenId]);

  const actual = fotoActual === null ? null : fotos[fotoActual] ?? null;

  useEffect(() => {
    if (fotoActual === null) return;
    function manejarTeclas(event: KeyboardEvent): void {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setFotoActual((indice) =>
          indice === null ? null : (indice + 1) % fotos.length,
        );
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setFotoActual((indice) =>
          indice === null
            ? null
            : (indice - 1 + fotos.length) % fotos.length,
        );
      }
    }
    window.addEventListener("keydown", manejarTeclas);
    return () => window.removeEventListener("keydown", manejarTeclas);
  }, [fotoActual, fotos.length]);

  const alSubir = useCallback(() => {
    setCargando(true);
    void getFotosByOrden(ordenId).then((resultado) => {
      setFotos(resultado.data);
      setError(resultado.error?.message ?? null);
      setCargando(false);
    });
  }, [ordenId]);

  return (
    <div className="space-y-5">
      <SubirFotos ordenId={ordenId} onSubidaCompletada={alSubir} />

      <Card>
        <CardHeader>
          <CardTitle>Galería de fotos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-7">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-rose px-3 py-2 text-sm text-rose-foreground"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {etapas.map(({ valor, etiqueta }) => {
            const fotosEtapa = fotos
              .map((foto, indice) => ({ foto, indice }))
              .filter(({ foto }) => foto.etapa === valor);

            return (
              <section key={valor} aria-labelledby={`etapa-${valor}`}>
                <h3
                  id={`etapa-${valor}`}
                  className="mb-3 text-sm font-semibold text-foreground"
                >
                  {etiqueta}
                  <span className="ml-2 text-xs font-normal text-muted">
                    ({fotosEtapa.length})
                  </span>
                </h3>
                {cargando ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton
                        key={index}
                        className="aspect-[4/3] w-full rounded-lg"
                      />
                    ))}
                  </div>
                ) : fotosEtapa.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {fotosEtapa.map(({ foto, indice }) => (
                      <button
                        key={foto.id}
                        type="button"
                        onClick={() => setFotoActual(indice)}
                        aria-label={`Ver foto de ${etiqueta}, ${new Date(foto.creado_en).toLocaleDateString("es-CO")}`}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                      >
                        <Image
                          src={foto.url}
                          alt={`Foto del vehículo en etapa ${etiqueta.toLowerCase()}`}
                          fill
                          unoptimized={foto.url.startsWith("data:")}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          loading="lazy"
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-ink/65 px-2 py-1.5 text-xs text-white">
                          {new Date(foto.creado_en).toLocaleDateString("es-CO")}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    className="py-6"
                    icon={ImageIcon}
                    title={`Sin fotos de ${etiqueta.toLowerCase()}`}
                    description="Las fotos que se suban para esta etapa aparecerán aquí."
                  />
                )}
              </section>
            );
          })}
        </CardContent>
      </Card>

      <Modal
        open={actual !== null}
        onClose={() => setFotoActual(null)}
        title={
          actual
            ? `${etapas.find((etapa) => etapa.valor === actual.etapa)?.etiqueta ?? "Foto"} · ${fotoActual! + 1} de ${fotos.length}`
            : "Foto"
        }
        size="lg"
        contentClassName="relative flex min-h-[50vh] items-center justify-center bg-ink p-2 sm:min-h-[65vh]"
      >
        {actual && (
          <>
            <div className="relative h-[50vh] w-full sm:h-[65vh]">
              <Image
                src={actual.url}
                alt={`Foto del vehículo en etapa ${actual.etapa}`}
                fill
                priority
                unoptimized={actual.url.startsWith("data:")}
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </div>
            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  onClick={() =>
                    setFotoActual(
                      (fotoActual! - 1 + fotos.length) % fotos.length,
                    )
                  }
                  className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-md hover:bg-surface"
                >
                  <ChevronLeft aria-hidden="true" className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Foto siguiente"
                  onClick={() =>
                    setFotoActual((fotoActual! + 1) % fotos.length)
                  }
                  className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-md hover:bg-surface"
                >
                  <ChevronRight aria-hidden="true" className="size-5" />
                </button>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
