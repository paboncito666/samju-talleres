import type { ReactNode } from "react";
import { AppShell } from "@/app/components/layout/app-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell activePath="/admin/personal">{children}</AppShell>;
}
