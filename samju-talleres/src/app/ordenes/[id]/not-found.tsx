import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function OrdenNoEncontrada() {
  return (
    <main className="mx-auto max-w-3xl">
      <EmptyState
        icon={ClipboardList}
        title="No encontramos esta orden"
        description="Verifica el enlace o vuelve al listado de órdenes de trabajo."
        action={
          <Link
            href="/vehiculos"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Volver a órdenes
          </Link>
        }
      />
    </main>
  );
}
