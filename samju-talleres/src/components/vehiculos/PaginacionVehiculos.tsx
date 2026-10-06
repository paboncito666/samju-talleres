import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PaginacionVehiculosProps {
  parametros: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
}

function urlPagina(
  parametros: Record<string, string>,
  page: number,
): string {
  const query = new URLSearchParams(parametros);
  if (page <= 1) {
    query.delete("page");
  } else {
    query.set("page", String(page));
  }
  const serialized = query.toString();
  return serialized ? `/vehiculos?${serialized}` : "/vehiculos";
}

export function PaginacionVehiculos({
  parametros,
  page,
  pageSize,
  total,
}: PaginacionVehiculosProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const primero = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const ultimo = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación de órdenes"
      className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted" aria-live="polite">
        Mostrando {primero}–{ultimo} de {total} órdenes
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={urlPagina(parametros, Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted sm:h-8",
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          Anterior
        </Link>
        <span className="min-w-24 text-center text-sm text-muted">
          Página {page} de {totalPaginas}
        </span>
        <Link
          href={urlPagina(parametros, Math.min(totalPaginas, page + 1))}
          aria-disabled={page >= totalPaginas}
          tabIndex={page >= totalPaginas ? -1 : undefined}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted sm:h-8",
            page >= totalPaginas && "pointer-events-none opacity-50",
          )}
        >
          Siguiente
        </Link>
      </div>
    </nav>
  );
}
