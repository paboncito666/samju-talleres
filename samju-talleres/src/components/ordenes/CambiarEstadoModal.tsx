"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { Button, Modal, Select, Textarea } from "@/components/ui";
import { ESTADOS, TRANSICIONES, type EstadoOrden } from "@/lib/estados";
import { cambiarEstadoOrdenAction } from "@/app/ordenes/[id]/actions";

const esquemaEstado = z.object({
  estado: z.enum([
    "RECIBIDO",
    "DIAGNOSTICO",
    "PENDIENTE",
    "REPARACION",
    "CALIDAD",
    "LISTO",
    "ENTREGADO",
    "CANCELADO",
  ]),
  motivo: z.string(),
}).superRefine((valores, contexto) => {
  if (valores.estado === "CANCELADO" && valores.motivo.trim().length < 3) {
    contexto.addIssue({
      code: "custom",
      message: "Indica un motivo de al menos 3 caracteres.",
      path: ["motivo"],
    });
  }
});

type FormularioEstado = z.infer<typeof esquemaEstado>;

export interface CambiarEstadoModalProps {
  ordenId: string;
  estadoActual: EstadoOrden;
  puedeCambiarEstado: boolean;
}

export function CambiarEstadoModal({
  ordenId,
  estadoActual,
  puedeCambiarEstado,
}: CambiarEstadoModalProps) {
  const [abierto, setAbierto] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const transiciones = TRANSICIONES[estadoActual];
  const form = useForm<FormularioEstado>({
    resolver: zodResolver(esquemaEstado),
    defaultValues: { estado: transiciones[0] ?? estadoActual, motivo: "" },
  });
  const estadoSeleccionado = useWatch({
    control: form.control,
    name: "estado",
  });

  if (!puedeCambiarEstado || transiciones.length === 0) {
    return null;
  }

  function cerrar(): void {
    setAbierto(false);
    setErrorServidor(null);
    form.reset({ estado: transiciones[0] ?? estadoActual, motivo: "" });
  }

  function enviar(valores: FormularioEstado): void {
    setErrorServidor(null);
    startTransition(async () => {
      const resultado = await cambiarEstadoOrdenAction(
        ordenId,
        valores.estado,
        valores.estado === "CANCELADO" ? valores.motivo.trim() : undefined,
      );
      if (resultado.error) {
        setErrorServidor(resultado.error);
        return;
      }
      cerrar();
    });
  }

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Cambiar estado</Button>
      <Modal
        open={abierto}
        onClose={cerrar}
        title="Cambiar estado de la orden"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={pendiente}
              onClick={cerrar}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-cambiar-estado"
              isLoading={pendiente}
            >
              Guardar cambio
            </Button>
          </>
        }
      >
        <form
          id="form-cambiar-estado"
          className="space-y-4"
          onSubmit={form.handleSubmit(enviar)}
        >
          <Select
            label="Nuevo estado"
            error={form.formState.errors.estado?.message}
            {...form.register("estado")}
          >
            {transiciones.map((estado) => (
              <option key={estado} value={estado}>
                {ESTADOS[estado].label}
              </option>
            ))}
          </Select>
          {estadoSeleccionado === "CANCELADO" && (
            <Textarea
              label="Motivo de cancelación"
              placeholder="Describe por qué se cancela esta orden"
              error={form.formState.errors.motivo?.message}
              {...form.register("motivo")}
            />
          )}
          {errorServidor && (
            <p
              role="alert"
              className="rounded-lg bg-rose px-3 py-2 text-sm text-rose-foreground"
            >
              {errorServidor}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
