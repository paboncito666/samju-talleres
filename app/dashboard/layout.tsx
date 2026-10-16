import type { ReactNode } from "react";
import { AppShell } from "@/app/components/layout/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell activePath="/dashboard">{children}</AppShell>;
}
