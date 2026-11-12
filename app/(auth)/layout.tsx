import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-theme relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden="true" className="admin-orb admin-orb-one" />
      <div aria-hidden="true" className="admin-orb admin-orb-two" />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}
