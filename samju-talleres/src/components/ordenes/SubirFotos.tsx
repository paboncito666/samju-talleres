"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, RotateCcw, Trash2, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { subirFoto } from "@/lib/data/fotos";
import type { EtapaFoto } from "@/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";

const TAMANO_MAXIMO = 5 * 1024 * 1024;
const TOTAL_MAXIMO = 10;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);

type EstadoArchivo = "pendiente" | "subiendo" | "subido" | "error";
interface ArchivoEnCola {
  id: string;
  file: File;
  previewUrl: string;
  estado: EstadoArchivo;
  error?: string;
}

const nombreEtapa: Record<EtapaFoto, string> = {
  entrada: "Entrada",
  proceso: "En proceso",
  salida: "Salida",
};

export interface SubirFotosProps {
  ordenId: string;
  onSubidaCompletada: () => void;
}

export function SubirFotos({
  ordenId,
  onSubidaCompletada,
}: SubirFotosProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const colaRef = useRef<ArchivoEnCola[]>([]);
  const [etapa, setEtapa] = useState<EtapaFoto>("entrada");
  const [cola, setCola] = useState<ArchivoEnCola[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargarUsuario(): Promise<void> {
      if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
        if (activo) {
          setUserId("mock-user");
          setErrorSesion(
            "Modo de demostración: las fotos mock se asociarán a un usuario local.",
          );
        }
        return;
      }

      try {
        const client = createSupabaseBrowserClient();
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        if (activo) {
          setUserId(data.user?.id ?? null);
          setErrorSesion(
            data.user
              ? null
              : "Inicia sesión para poder subir fotos a esta orden.",
          );
        }
      } catch (error) {
        if (activo) {
          setUserId(null);
          setErrorSesion(
            error instanceof Error
              ? error.message
              : "No se pudo verificar la sesión. Vuelve a intentarlo.",
          );
        }
      }
    }
    void cargarUsuario();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    colaRef.current = cola;
  }, [cola]);

  useEffect(
    () => () => {
      colaRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    },
    [],
  );

  const agregarArchivos = useCallback((files: FileList | File[]) => {
    const seleccionados = Array.from(files);
    const errores: ArchivoEnCola[] = [];
    const validos: ArchivoEnCola[] = [];

    seleccionados.forEach((file, index) => {
      let error: string | undefined;
      if (!TIPOS_PERMITIDOS.has(file.type)) {
        error = "Formato no permitido. Usa JPG, PNG o WebP.";
      } else if (file.size > TAMANO_MAXIMO) {
        error = "El archivo supera el máximo de 5 MB.";
      } else if (file.size === 0) {
        error = "El archivo está vacío.";
      }

      const item: ArchivoEnCola = {
        id: `${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        file,
        previewUrl: error ? "" : URL.createObjectURL(file),
        estado: error ? "error" : "pendiente",
        error,
      };
      (error ? errores : validos).push(item);
    });

    setCola((actual) => {
      const disponibles = Math.max(0, TOTAL_MAXIMO - actual.length);
      const agregar = validos.slice(0, disponibles);
      const excedentes = validos.slice(disponibles).map((item) => ({
        ...item,
        estado: "error" as const,
        error: `Máximo ${TOTAL_MAXIMO} archivos por tanda.`,
      }));
      return [...actual, ...agregar, ...errores, ...excedentes];
    });
    setMensajeExito(null);
  }, []);

  function quitarArchivo(id: string): void {
    setCola((actual) => {
      const archivo = actual.find((item) => item.id === id);
      if (archivo?.previewUrl) URL.revokeObjectURL(archivo.previewUrl);
      return actual.filter((item) => item.id !== id);
    });
  }

  async function subirPendientes(): Promise<void> {
    if (!userId) {
      setErrorSesion("Inicia sesión para poder subir fotos a esta orden.");
      return;
    }
    const porSubir = cola.filter(
      (item) => item.estado === "pendiente" || item.estado === "error",
    );
    if (porSubir.length === 0) return;

    setSubiendo(true);
    setMensajeExito(null);
    let subidos = 0;

    for (const item of porSubir) {
      setCola((actual) =>
        actual.map((archivo) =>
          archivo.id === item.id
            ? { ...archivo, estado: "subiendo", error: undefined }
            : archivo,
        ),
      );
      const resultado = await subirFoto({
        ordenId,
        etapa,
        archivo: item.file,
        userId,
      });
      if (resultado.error) {
        setCola((actual) =>
          actual.map((archivo) =>
            archivo.id === item.id
              ? { ...archivo, estado: "error", error: resultado.error.message }
              : archivo,
          ),
        );
      } else {
        setCola((actual) =>
          actual.map((archivo) =>
            archivo.id === item.id ? { ...archivo, estado: "subido" } : archivo,
          ),
        );
        subidos += 1;
      }
    }

    setSubiendo(false);
    if (subidos > 0) {
      setMensajeExito(
        `${subidos} ${subidos === 1 ? "foto subida" : "fotos subidas"} correctamente.`,
      );
      router.refresh();
      onSubidaCompletada();
    }
  }

  const archivosValidos = cola.some(
    (item) => item.estado === "pendiente" || item.estado === "error",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir fotos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          label="Etapa de la foto"
          value={etapa}
          onChange={(event) => setEtapa(event.target.value as EtapaFoto)}
          disabled={subiendo}
        >
          <option value="entrada">{nombreEtapa.entrada}</option>
          <option value="proceso">{nombreEtapa.proceso}</option>
          <option value="salida">{nombreEtapa.salida}</option>
        </Select>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(event) => {
            event.preventDefault();
            setArrastrando(false);
            agregarArchivos(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${
            arrastrando ? "border-ink bg-surface-muted" : "border-line"
          }`}
        >
          <ImagePlus aria-hidden="true" className="mb-3 size-7 text-muted" />
          <p className="text-sm font-medium text-foreground">
            Arrastra fotos aquí
          </p>
          <p className="mt-1 text-xs text-muted">
            JPG, PNG o WebP · máximo 5 MB por archivo · hasta 10 por tanda
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) agregarArchivos(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            iconLeft={<ImagePlus aria-hidden="true" size={15} />}
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
          >
            Seleccionar archivos
          </Button>
        </div>

        {errorSesion && (
          <p
            role="status"
            className="rounded-lg bg-estado-pendiente px-3 py-2 text-sm text-estado-pendiente-text"
          >
            {errorSesion}
          </p>
        )}
        {mensajeExito && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-estado-calidad px-3 py-2 text-sm text-estado-calidad-text"
          >
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            {mensajeExito}
          </p>
        )}

        {cola.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cola.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-line p-2.5"
              >
                {item.previewUrl ? (
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                    <Image
                      src={item.previewUrl}
                      alt={`Vista previa de ${item.file.name}`}
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-rose text-rose-foreground">
                    <ImagePlus aria-hidden="true" className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {item.error && (
                    <p className="mt-1 text-xs text-rose-foreground">
                      {item.error}
                    </p>
                  )}
                  <p
                    className="mt-1 text-xs text-muted"
                    aria-live="polite"
                  >
                    {item.estado === "subiendo" && "Subiendo…"}
                    {item.estado === "subido" && "Subida completada"}
                    {item.estado === "pendiente" && "Pendiente"}
                    {item.estado === "error" && "No se pudo subir"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.estado === "error" && item.previewUrl && (
                    <button
                      type="button"
                      aria-label={`Reintentar ${item.file.name}`}
                      disabled={subiendo || !userId}
                      onClick={() => {
                        setCola((actual) =>
                          actual.map((archivo) =>
                            archivo.id === item.id
                              ? {
                                  ...archivo,
                                  estado: "pendiente",
                                  error: undefined,
                                }
                              : archivo,
                          ),
                        );
                      }}
                      className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-muted disabled:opacity-50"
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                    </button>
                  )}
                  {item.estado !== "subido" && (
                    <button
                      type="button"
                      aria-label={`Quitar ${item.file.name}`}
                      disabled={subiendo}
                      onClick={() => quitarArchivo(item.id)}
                      className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-rose hover:text-rose-foreground disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Etapa seleccionada: {nombreEtapa[etapa]}
          </p>
          <Button
            onClick={() => void subirPendientes()}
            disabled={!archivosValidos || subiendo || !userId}
            isLoading={subiendo}
            iconLeft={<Upload aria-hidden="true" size={16} />}
          >
            Subir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
