import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="admin-reveal relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#192722] via-[#223b31] to-[#426653] px-5 py-7 text-white shadow-[0_24px_70px_-38px_rgba(27,54,42,0.75)] sm:px-8 sm:py-9">
      <div aria-hidden="true" className="admin-orb admin-orb-one" />
      <div aria-hidden="true" className="admin-orb admin-orb-two" />
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 backdrop-blur">
            <Icon className="size-3.5" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{description}</p>
        </div>
        {action}
      </div>
      {children && <div className="relative z-10 mt-7 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">{children}</div>}
    </header>
  );
}

export function PageHeroStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm sm:p-4">
      <div className="flex min-h-9 items-start justify-between gap-1 text-white/70 sm:min-h-0">
        <span className="text-[11px] font-medium leading-4 sm:text-xs">{label}</span>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums sm:mt-2 sm:text-2xl">{value}</p>
    </div>
  );
}
