import { VehicleRegistrationForm } from "@/app/components/vehiculos/vehicle-registration-form";

export default function NewVehiclePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Flota del taller
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Registrar vehículo
        </h1>
        <p className="mt-2 text-sm text-muted">
          Registra los datos del automotor y luego abre su orden para adjuntar
          fotografías de ingreso.
        </p>
      </header>
      <VehicleRegistrationForm />
    </main>
  );
}
