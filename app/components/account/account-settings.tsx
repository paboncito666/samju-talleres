"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const maxAvatarSize = 5 * 1024 * 1024;
const acceptedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type Feedback = { kind: "success" | "error"; message: string } | null;

export function AccountSettings({
  avatarUrl,
  email,
  name,
}: {
  avatarUrl: string | null;
  email: string;
  name: string;
}) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [emailValue, setEmailValue] = useState(email);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function setSectionFeedback(section: string, value: Feedback) {
    setFeedback((current) => ({ ...current, [section]: value }));
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = nameValue.trim();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setSectionFeedback("name", { kind: "error", message: "El nombre debe tener entre 2 y 80 caracteres." });
      return;
    }
    setBusy("name");
    setSectionFeedback("name", null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nombre_confirmado")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;

      if (profile.nombre_confirmado) {
        const { error } = await supabase
          .from("profiles")
          .update({ nombre: normalizedName })
          .eq("id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("confirm_own_profile_name", {
          new_name: normalizedName,
        });
        if (error) throw error;
      }
      setNameValue(normalizedName);
      setSectionFeedback("name", { kind: "success", message: "Nombre actualizado." });
      router.refresh();
    } catch (error) {
      setSectionFeedback("name", {
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar el nombre.",
      });
    } finally {
      setBusy("");
    }
  }

  async function saveAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!avatarFile) {
      setSectionFeedback("avatar", { kind: "error", message: "Selecciona una imagen." });
      return;
    }
    if (!acceptedAvatarTypes.has(avatarFile.type) || avatarFile.size <= 0 || avatarFile.size > maxAvatarSize) {
      setSectionFeedback("avatar", { kind: "error", message: "Usa una imagen JPG, PNG o WebP de hasta 5 MB." });
      return;
    }

    setBusy("avatar");
    setSectionFeedback("avatar", null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");

      const extension = avatarFile.type === "image/jpeg" ? "jpg" : avatarFile.type.split("/")[1];
      const path = `${user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      setAvatarFile(null);
      setAvatarPreview(null);
      setSectionFeedback("avatar", { kind: "success", message: "Foto de perfil actualizada." });
      router.refresh();
    } catch (error) {
      setSectionFeedback("avatar", {
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar la foto.",
      });
    } finally {
      setBusy("");
    }
  }

  function chooseAvatar(file: File | null) {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
    setSectionFeedback("avatar", null);
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = emailValue.trim();
    if (!normalizedEmail || normalizedEmail === email) {
      setSectionFeedback("email", { kind: "error", message: "Ingresa un correo diferente al actual." });
      return;
    }
    setBusy("email");
    setSectionFeedback("email", null);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ email: normalizedEmail });
      if (error) throw error;
      setSectionFeedback("email", {
        kind: "success",
        message: "Solicitamos el cambio. Confirma la dirección siguiendo el enlace enviado por correo.",
      });
    } catch (error) {
      setSectionFeedback("email", {
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo solicitar el cambio de correo.",
      });
    } finally {
      setBusy("");
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setSectionFeedback("password", { kind: "error", message: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (password !== confirmPassword) {
      setSectionFeedback("password", { kind: "error", message: "Las contraseñas no coinciden." });
      return;
    }
    setBusy("password");
    setSectionFeedback("password", null);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      setSectionFeedback("password", { kind: "success", message: "Contraseña actualizada." });
    } catch (error) {
      setSectionFeedback("password", {
        kind: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar la contraseña.",
      });
    } finally {
      setBusy("");
    }
  }

  const displayedAvatar = avatarPreview ?? (avatarUrl?.startsWith("https://") ? avatarUrl : null);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Foto de perfil</h2>
        <p className="mt-1 text-sm text-muted">JPG, PNG o WebP; máximo 5 MB.</p>
        <form className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center" onSubmit={saveAvatar}>
          {displayedAvatar ? (
            <Image
              alt="Vista previa de la foto de perfil"
              className="size-20 rounded-full border border-line object-cover"
              height={80}
              src={displayedAvatar}
              unoptimized
              width={80}
            />
          ) : (
            <div aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-full bg-mist text-2xl font-semibold text-ink">
              {name.slice(0, 1).toLocaleUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block text-sm font-medium text-ink">
              Seleccionar imagen
              <input
                accept="image/jpeg,image/png,image/webp"
                className="mt-1.5 block w-full text-sm text-muted"
                onChange={(event) => chooseAvatar(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <button
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy === "avatar" || !avatarFile}
              type="submit"
            >
              {busy === "avatar" ? "Subiendo..." : "Guardar foto"}
            </button>
            <FeedbackMessage feedback={feedback.avatar} />
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Nombre de usuario</h2>
        <p className="mt-1 text-sm text-muted">Este nombre se muestra al equipo en la aplicación.</p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={saveName}>
          <label className="sr-only" htmlFor="account-name">Nombre</label>
          <input
            autoComplete="name"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2.5 text-sm"
            id="account-name"
            maxLength={80}
            minLength={2}
            onChange={(event) => setNameValue(event.target.value)}
            required
            value={nameValue}
          />
          <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy === "name"} type="submit">
            {busy === "name" ? "Guardando..." : "Actualizar nombre"}
          </button>
        </form>
        <FeedbackMessage feedback={feedback.name} />
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Correo electrónico</h2>
        <p className="mt-1 text-sm text-muted">
          Por seguridad, Supabase puede pedir confirmar el correo actual y el nuevo.
        </p>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={saveEmail}>
          <label className="sr-only" htmlFor="account-email">Nuevo correo electrónico</label>
          <input
            autoComplete="email"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2.5 text-sm"
            id="account-email"
            onChange={(event) => setEmailValue(event.target.value)}
            required
            type="email"
            value={emailValue}
          />
          <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy === "email"} type="submit">
            {busy === "email" ? "Solicitando..." : "Cambiar correo"}
          </button>
        </form>
        <FeedbackMessage feedback={feedback.email} />
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Contraseña</h2>
        <p className="mt-1 text-sm text-muted">Usa al menos 8 caracteres.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={savePassword}>
          <label className="text-sm font-medium text-ink">
            Nueva contraseña
            <input
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Confirmar contraseña
            <input
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button className="justify-self-start rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2" disabled={busy === "password"} type="submit">
            {busy === "password" ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </form>
        <FeedbackMessage feedback={feedback.password} />
      </section>
    </div>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={`mt-3 text-sm ${feedback.kind === "error" ? "text-rose-foreground" : "text-sage-foreground"}`}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </p>
  );
}
