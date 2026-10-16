import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function OrdenesPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Órdenes de trabajo
        </h1>
        <p className="mt-1 text-sm text-muted">
          Consulta y da seguimiento a las órdenes del taller.
        </p>
      </header>
      <EmptyState
        icon={ClipboardList}
        title="Módulo de órdenes en preparación"
        description="Aquí podrás consultar y dar seguimiento a las órdenes de trabajo."
      />
    </main>
  );
}
