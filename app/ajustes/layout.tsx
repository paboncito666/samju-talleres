import type { ReactNode } from "react";
import { AppShell } from "@/app/components/layout/app-shell";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <AppShell activePath="/ajustes/cuenta">{children}</AppShell>;
}
