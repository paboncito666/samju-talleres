import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <section className="max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-ink">Acceso no autorizado</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Tu perfil está inactivo o no tiene permisos para esta sección. Contacta al administrador del taller.
        </p>
        <Link className="mt-6 inline-flex rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white" href="/login">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
