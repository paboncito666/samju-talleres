import type { ReactNode } from "react";
import { AppShell } from "@/app/components/layout/app-shell";

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return <AppShell activePath="/ordenes">{children}</AppShell>;
}
