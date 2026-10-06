"use client";

import { FormEvent, useState } from "react";
import { z } from "zod";
import { AlertCircle, MessageSquareText, Send, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const noteSchema = z
  .string()
  .trim()
  .min(1, "Escribe una nota antes de publicarla.")
  .max(2000, "La nota no puede superar los 2000 caracteres.");

type Note = {
  id: string;
  orden_id: string;
  autor_id: string | null;
  autor_nombre: string;
  contenido: string;
  creado_en: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function InternalNotes({
  initialNotes,
  orderId,
}: {
  initialNotes: Note[];
  orderId: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const parsedContent = noteSchema.safeParse(content);
    if (!parsedContent.success) {
      setErrorMessage(parsedContent.error.issues[0]?.message ?? "Nota inválida.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(`No se pudo verificar tu sesión: ${userError.message}`);
      }
      if (!user) {
        throw new Error("Inicia sesión para agregar una nota interna.");
      }

      const { data: note, error: insertError } = await supabase
        .from("notas_internas")
        .insert({
          orden_id: orderId,
          autor_id: user.id,
          contenido: parsedContent.data,
        })
        .select("id, orden_id, autor_id, contenido, creado_en")
        .single();

      if (insertError) {
        throw new Error(`No se pudo guardar la nota: ${insertError.message}`);
      }

      setNotes((currentNotes) => [
        { ...note, autor_nombre: "Tú" },
        ...currentNotes,
      ]);
      setContent("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al guardar la nota.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <form
        className="h-fit rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6"
        onSubmit={handleSubmit}
      >
        <label
          className="text-sm font-semibold text-ink"
          htmlFor="internal-note"
        >
          Agregar una nota
        </label>
        <p className="mt-1 text-xs leading-5 text-muted">
          Comparte información importante con el equipo. Solo el personal
          autorizado puede ver estas notas.
        </p>
        <textarea
          aria-describedby={
            errorMessage ? "internal-note-error" : "internal-note-count"
          }
          className="mt-4 min-h-36 w-full resize-y rounded-xl border border-line bg-background px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
          id="internal-note"
          maxLength={2000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escribe una actualización para el equipo..."
          value={content}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p
            aria-live="polite"
            className={`flex items-center gap-1.5 text-xs ${
              errorMessage ? "text-red-700" : "text-muted"
            }`}
            id={errorMessage ? "internal-note-error" : "internal-note-count"}
            role={errorMessage ? "alert" : undefined}
          >
            {errorMessage && <AlertCircle aria-hidden="true" size={14} />}
            {errorMessage || `${content.length}/2000 caracteres`}
          </p>
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting || content.trim().length === 0}
            type="submit"
          >
            <Send aria-hidden="true" size={15} />
            {isSubmitting ? "Guardando..." : "Publicar nota"}
          </button>
        </div>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MessageSquareText
              aria-hidden="true"
              className="text-muted"
              size={17}
            />
            Actividad
          </h3>
          <span className="text-xs text-muted">
            {notes.length} {notes.length === 1 ? "nota" : "notas"}
          </span>
        </div>
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-5 py-10 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-mist text-muted">
              <MessageSquareText aria-hidden="true" size={19} />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">
              Todavía no hay notas
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              La primera actualización del equipo aparecerá aquí.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {notes.map((note) => (
              <li
                className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5"
                key={note.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <UserRound
                      aria-hidden="true"
                      className="text-muted"
                      size={15}
                    />
                    {note.autor_nombre}
                  </span>
                  <time
                    className="text-xs text-muted"
                    dateTime={note.creado_en}
                  >
                    {dateFormatter.format(new Date(note.creado_en))}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-ink">
                  {note.contenido}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
