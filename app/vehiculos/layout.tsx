import type { ReactNode } from "react";
import { AppShell } from "@/app/components/layout/app-shell";

export default function VehiclesLayout({ children }: { children: ReactNode }) {
  return <AppShell activePath="/vehiculos">{children}</AppShell>;
}
