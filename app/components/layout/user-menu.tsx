"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  Type,
  UserRound,
} from "lucide-react";
import type { ProfileRole } from "@/lib/auth/permissions";

type ThemePreference = "light" | "dark";
type FontSizePreference = "small" | "normal" | "large";

const fontSizeLabels: Record<FontSizePreference, string> = {
  small: "Pequeña",
  normal: "Normal",
  large: "Grande",
};

export function UserMenu({
  avatarUrl,
  email,
  name,
  role,
  signOutAction,
}: {
  avatarUrl: string | null;
  email: string;
  name: string;
  role: ProfileRole;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [fontSize, setFontSize] = useState<FontSizePreference>("normal");
  const menuRef = useRef<HTMLDivElement>(null);
  const safeAvatarUrl = avatarUrl?.startsWith("https://") ? avatarUrl : null;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("samju-theme");
    const savedFontSize = window.localStorage.getItem("samju-font-size");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedFontSize === "small" || savedFontSize === "normal" || savedFontSize === "large") {
      setFontSize(savedFontSize);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("samju-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    window.localStorage.setItem("samju-font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-controls="account-menu-panel"
        aria-label="Abrir menú de cuenta y ajustes"
        className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 pr-2.5 text-left hover:bg-mist"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {safeAvatarUrl ? (
          <Image
            alt=""
            className="size-9 rounded-lg object-cover"
            height={36}
            src={safeAvatarUrl}
            unoptimized
            width={36}
          />
        ) : (
          <span className="grid size-9 place-items-center rounded-lg bg-mist text-ink">
            <UserRound aria-hidden="true" size={18} />
          </span>
        )}
        <span className="hidden max-w-36 sm:block">
          <span className="block truncate text-sm font-medium text-ink">{name}</span>
          <span className="block text-xs capitalize text-muted">{role}</span>
        </span>
        <ChevronDown aria-hidden="true" className="text-muted" size={16} />
      </button>

      {open && (
        <div
          aria-label="Cuenta y preferencias"
          className="absolute right-0 z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-3 shadow-soft"
          id="account-menu-panel"
        >
          <div className="border-b border-line px-3 pb-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            <p className="mt-1 text-xs capitalize text-muted">{role}</p>
          </div>

          <Link
            className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-mist"
            href="/ajustes/cuenta"
            onClick={() => setOpen(false)}
          >
            <Settings aria-hidden="true" size={17} />
            Ajustes de la cuenta
          </Link>

          <div className="mt-2 border-t border-line px-3 pt-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Sun aria-hidden="true" size={15} />
              Apariencia
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                aria-pressed={theme === "light"}
                className="flex items-center justify-center gap-2 rounded-lg border border-line px-2 py-2 text-xs text-ink aria-pressed:border-ink aria-pressed:bg-mist"
                onClick={() => setTheme("light")}
                type="button"
              >
                <Sun aria-hidden="true" size={15} />
                Claro
              </button>
              <button
                aria-pressed={theme === "dark"}
                className="flex items-center justify-center gap-2 rounded-lg border border-line px-2 py-2 text-xs text-ink aria-pressed:border-ink aria-pressed:bg-mist"
                onClick={() => setTheme("dark")}
                type="button"
              >
                <Moon aria-hidden="true" size={15} />
                Oscuro
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-muted">
              <Type aria-hidden="true" size={15} />
              Tamaño de texto
              <select
                className="ml-auto rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink"
                onChange={(event) => setFontSize(event.target.value as FontSizePreference)}
                value={fontSize}
              >
                {Object.entries(fontSizeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <form action={signOutAction} className="mt-3 border-t border-line pt-2">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-foreground hover:bg-rose"
              type="submit"
            >
              <LogOut aria-hidden="true" size={17} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
