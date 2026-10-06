"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { ESTADOS, type EstadoOrden } from "@/lib/estados";
import { Button, Input, Select } from "@/components/ui";

export interface FiltrosVehiculosProps {
  mecanicos: { id: string; nombre: string }[];
}

const estados = Object.keys(ESTADOS) as EstadoOrden[];

export function FiltrosVehiculos({ mecanicos }: FiltrosVehiculosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  const queryActual = searchParams.get("q") ?? "";
  const actualizarParametros = useCallback((
    cambios: Record<string, string | null>,
  ): void => {
    const parametros = new URLSearchParams(searchParams.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) {
        parametros.set(clave, valor);
      } else {
        parametros.delete(clave);
      }
    }
    parametros.delete("page");
    const query = parametros.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }, [pathname, router, searchParams, startTransition]);

  useEffect(() => {
    const valor = busqueda.trim();
    if (valor === queryActual) {
      return;
    }
    const timeout = window.setTimeout(() => {
      actualizarParametros({ q: valor || null });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [actualizarParametros, busqueda, queryActual]);

  function limpiarFiltros(): void {
    setBusqueda("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const hayFiltros = ["q", "estado", "mecanicoId", "desde", "hasta"].some(
    (parametro) => searchParams.has(parametro),
  );

  return (
    <section
      aria-label="Filtros de órdenes"
      className="rounded-xl border border-line bg-surface p-4 shadow-sm"
      aria-busy={pending}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_repeat(4,minmax(130px,1fr))_auto]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-[2.35rem] size-4 text-muted"
          />
          <Input
            label="Buscar"
            type="search"
            placeholder="Placa o propietario"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          label="Estado"
          value={searchParams.get("estado") ?? ""}
          onChange={(event) =>
            actualizarParametros({ estado: event.target.value || null })
          }
        >
          <option value="">Todos los estados</option>
          {estados.map((estado) => (
            <option key={estado} value={estado}>
              {ESTADOS[estado].label}
            </option>
          ))}
        </Select>
        <Select
          label="Mecánico"
          value={searchParams.get("mecanicoId") ?? ""}
          onChange={(event) =>
            actualizarParametros({ mecanicoId: event.target.value || null })
          }
        >
          <option value="">Todos los mecánicos</option>
          {mecanicos.map((mecanico) => (
            <option key={mecanico.id} value={mecanico.id}>
              {mecanico.nombre}
            </option>
          ))}
        </Select>
        <Input
          label="Desde"
          type="date"
          value={searchParams.get("desde") ?? ""}
          onChange={(event) =>
            actualizarParametros({ desde: event.target.value || null })
          }
        />
        <Input
          label="Hasta"
          type="date"
          value={searchParams.get("hasta") ?? ""}
          onChange={(event) =>
            actualizarParametros({ hasta: event.target.value || null })
          }
        />
        <div className="flex items-end">
          <Button
            variant="secondary"
            onClick={limpiarFiltros}
            disabled={!hayFiltros && !busqueda}
            className="w-full xl:w-auto"
            iconLeft={<RotateCcw aria-hidden="true" size={16} />}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
    </section>
  );
}
