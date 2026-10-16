import type { ReactNode } from "react";
import { AppShell } from "@/app/components/layout/app-shell";

export default function HistoryLayout({ children }: { children: ReactNode }) {
  return <AppShell activePath="/historial">{children}</AppShell>;
}
