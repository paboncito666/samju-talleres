import Link from "next/link";

export default function RegisterPage() {
  return (
    <section className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-soft sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        SAMJU Talleres · Personal
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-ink">
        Registro por invitación
      </h1>
      <p className="mt-2 text-sm text-muted">
        Las cuentas del equipo las crea el administrador. Solicita una invitación para acceder.
      </p>
      <Link
        className="mt-6 inline-flex rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white"
        href="/login"
      >
        Volver a iniciar sesión
      </Link>
    </section>
  );
}
