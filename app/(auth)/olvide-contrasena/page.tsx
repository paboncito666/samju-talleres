import Link from "next/link";
import { Suspense } from "react";
import { MailCheck } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <section className="admin-reveal mx-auto w-full max-w-xl rounded-[2rem] border border-line bg-white p-6 shadow-[0_32px_100px_-44px_rgba(27,54,42,0.42)] sm:p-10">
      <div className="mb-8 grid size-12 place-items-center rounded-2xl bg-mist text-primary">
        <MailCheck className="size-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recuperación de acceso</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Restablece tu contraseña</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
      </p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        <Link className="font-medium text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-300" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </section>
  );
}
