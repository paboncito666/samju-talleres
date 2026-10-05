import { ArrowUpRight, ClipboardList, ShieldCheck, Wrench } from "lucide-react";

const foundations = [
  {
    icon: ClipboardList,
    title: "Operación organizada",
    description:
      "Órdenes de trabajo, vehículos y actividad del taller en un solo lugar.",
  },
  {
    icon: ShieldCheck,
    title: "Acceso responsable",
    description:
      "La aplicación es para el equipo interno y se conectará a Supabase.",
  },
  {
    icon: Wrench,
    title: "Una base compartida",
    description:
      "Estructura lista para que cada integrante construya su módulo.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <a
            aria-label="SAMJU Talleres, inicio"
            className="flex items-center gap-3"
            href="/"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-ink text-white">
              <Wrench aria-hidden="true" size={20} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.12em] text-ink">
                SAMJU
              </span>
              <span className="block text-xs text-muted">Talleres</span>
            </span>
          </a>
          <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted">
            Plataforma interna
          </span>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              <span className="size-2 rounded-full bg-sage" />
              Fase 0 · Base del proyecto
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              El taller, con todo bajo control.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Estamos preparando un espacio de trabajo claro para coordinar
              órdenes, vehículos y al equipo de SAMJU Talleres.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white">
                Base del equipo lista
                <ArrowUpRight aria-hidden="true" size={16} />
              </span>
              <span className="text-sm text-muted">
                Acceso reservado al personal del taller
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Fundamentos del sistema
                </p>
                <p className="mt-1 text-sm text-muted">
                  Una base común para los siguientes módulos.
                </p>
              </div>
              <span className="rounded-lg bg-mist px-3 py-1.5 text-xs font-medium text-ink">
                Preparado
              </span>
            </div>
            <ul className="space-y-6">
              {foundations.map(({ icon: Icon, title, description }) => (
                <li className="flex gap-4" key={title}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-ink">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-line pt-5 text-xs leading-5 text-muted">
              Next.js · TypeScript · Tailwind CSS · Supabase
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>SAMJU Talleres · Herramienta de gestión interna</span>
          <span>Construida para el equipo del taller</span>
        </footer>
      </div>
    </main>
  );
}
