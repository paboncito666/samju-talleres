import type { ReactNode } from "react";
import Link from "next/link";
import { Wrench } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 size-96 rounded-full bg-sage/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-lavender/60 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link aria-label="SAMJU Talleres, inicio" className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
            <Wrench aria-hidden="true" size={19} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.12em] text-ink">
              SAMJU
            </span>
            <span className="block text-xs text-muted">Talleres</span>
          </span>
        </Link>
        <span className="hidden rounded-full border border-line bg-surface/80 px-3 py-1.5 text-xs font-medium text-muted sm:inline-flex">
          Portal del equipo
        </span>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center py-12">
        {children}
      </section>

      <footer className="relative z-10 mx-auto w-full max-w-6xl border-t border-line/80 pt-4 text-center text-xs text-muted">
        SAMJU Talleres · Acceso exclusivo para el personal autorizado
      </footer>
    </main>
  );
}
