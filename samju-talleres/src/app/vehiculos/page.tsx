import { CarFront } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function VehiculosPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Vehículos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Consulta y administra los vehículos del taller.
        </p>
      </header>
      <EmptyState
        icon={CarFront}
        title="Módulo de vehículos en preparación"
        description="Aquí podrás consultar y administrar los vehículos registrados en el taller."
      />
    </main>
  );
}
