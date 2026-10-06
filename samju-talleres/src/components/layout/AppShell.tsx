"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const enlaces = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehiculos", label: "Vehículos", icon: Wrench },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
];

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const navegacion = (
    <nav aria-label="Navegación principal" className="space-y-1">
      {enlaces.map(({ href, label, icon: Icon }) => {
        const activo = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            onClick={() => setMenuAbierto(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              activo
                ? "bg-surface-muted text-ink"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link
          href="/dashboard"
          className="mb-9 flex items-center gap-3 px-2"
          aria-label="SAMJU Talleres, ir al dashboard"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-ink text-white">
            <Wrench aria-hidden="true" className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">
              SAMJU Talleres
            </span>
            <span className="block text-xs text-muted">Gestión interna</span>
          </span>
        </Link>
        {navegacion}
        <div className="mt-auto border-t border-line pt-4">
          <button
            type="button"
            title="La sesión será conectada próximamente"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      <aside
        id="mobile-navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col border-r border-line bg-surface px-4 py-5 shadow-md transition-transform lg:hidden",
          menuAbierto ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Menú móvil"
        aria-hidden={!menuAbierto}
        inert={!menuAbierto}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-2"
            onClick={() => setMenuAbierto(false)}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-ink text-white">
              <Wrench aria-hidden="true" className="size-4" />
            </span>
            <span className="text-sm font-semibold text-ink">
              SAMJU Talleres
            </span>
          </Link>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuAbierto(false)}
            className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-muted"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        {navegacion}
        <button
          type="button"
          title="La sesión será conectada próximamente"
          className="mt-auto flex min-h-11 items-center gap-3 rounded-lg border-t border-line px-3 py-4 text-sm text-muted"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Cerrar sesión
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-controls="mobile-navigation"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground lg:hidden"
          >
            {menuAbierto ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
          <span className="text-sm font-semibold text-ink lg:hidden">
            SAMJU Talleres
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              Sesión de trabajo
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-surface-muted text-sm font-medium text-foreground">
              U
            </span>
            <span className="text-sm font-medium text-foreground">Usuario</span>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
