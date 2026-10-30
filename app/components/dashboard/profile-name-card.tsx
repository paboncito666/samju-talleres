"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { updateProfileName } from "@/app/dashboard/profile-name-actions";

function subscribeToDismissal(eventName: string, callback: () => void) {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}

export function ProfileNameCard({
  error,
  userId,
}: {
  error?: string;
  userId: string;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const errorMessage =
    error === "nombre"
      ? "Escribe un nombre de entre 2 y 80 caracteres."
      : error === "guardar"
        ? "No se pudo guardar el nombre. Inténtalo de nuevo."
        : "";
  const dismissalKey = `samju-profile-name-dismissed:${userId}`;
  const dismissalEvent = `${dismissalKey}:change`;
  const isDismissed = useSyncExternalStore(
    (callback) => subscribeToDismissal(dismissalEvent, callback),
    () => window.sessionStorage.getItem(dismissalKey) === "1",
    () => true,
  );
  const isOpen = Boolean(error) || !isDismissed;
  const dismiss = useCallback(() => {
    window.sessionStorage.setItem(dismissalKey, "1");
    window.dispatchEvent(new Event(dismissalEvent));
  }, [dismissalEvent, dismissalKey]);

  useEffect(() => {
    if (!isOpen) return;

    nameInput.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dismiss, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        aria-labelledby="profile-name-heading"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
      >
        <button
          aria-label="Cerrar y hacerlo más tarde"
          className="absolute right-4 top-4 rounded-lg p-2 text-muted transition hover:bg-mist hover:text-ink"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Completa tu perfil
        </p>
        <h2
          className="mt-2 pr-8 text-xl font-semibold tracking-tight text-ink sm:text-2xl"
          id="profile-name-heading"
        >
          Elige cómo aparecer en el taller
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Puedes guardarlo ahora o{" "}
          <Link className="font-medium text-ink underline underline-offset-4" href="/ajustes/cuenta">
            cambiarlo más adelante en ajustes de la cuenta
          </Link>
          .
        </p>

        <form action={updateProfileName} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="profile-display-name">
              Nombre
            </label>
            <input
              autoComplete="name"
              className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none transition focus:border-ink"
              id="profile-display-name"
              maxLength={80}
              minLength={2}
              name="nombre"
              placeholder="Tu nombre"
              ref={nameInput}
              required
            />
          </div>
          {errorMessage && (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <div className="flex flex-col-reverse justify-end gap-3 pt-1 sm:flex-row">
            <button
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-mist"
              onClick={dismiss}
              type="button"
            >
              Más tarde
            </button>
            <button
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90"
              type="submit"
            >
              Guardar nombre
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
