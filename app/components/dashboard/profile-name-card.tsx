import { updateProfileName } from "@/app/dashboard/profile-name-actions";

export function ProfileNameCard({ error }: { error?: string }) {
  const errorMessage =
    error === "nombre"
      ? "Escribe un nombre de entre 2 y 80 caracteres."
      : error === "guardar"
        ? "No se pudo guardar el nombre. Inténtalo de nuevo."
        : "";

  return (
    <section
      aria-labelledby="profile-name-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Completa tu perfil
        </p>
        <h2
          className="mt-2 text-xl font-semibold tracking-tight text-ink"
          id="profile-name-heading"
        >
          Actualiza tu nombre
        </h2>
        <p className="mt-2 text-sm text-muted">
          Elige cómo quieres aparecer ante el equipo del taller.
        </p>
        <form action={updateProfileName} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="profile-display-name">
            Nombre
          </label>
          <input
            autoComplete="name"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2.5 text-sm"
            id="profile-display-name"
            maxLength={80}
            minLength={2}
            name="nombre"
            placeholder="Tu nombre"
            required
          />
          <button
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            type="submit"
          >
            Guardar nombre
          </button>
        </form>
        {errorMessage && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
