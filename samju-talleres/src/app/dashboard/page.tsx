import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Panel",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const fullName = user.user_metadata.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName.trim()
      : user.email;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
              <Wrench aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.12em] text-ink">
                SAMJU
              </span>
              <span className="block text-xs text-muted">Talleres</span>
            </span>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Espacio de trabajo
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Hola, {displayName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Tu sesión está activa. El panel de gestión del taller estará
            disponible aquí.
          </p>

          <Card className="mt-10 max-w-2xl">
            <CardHeader>
              <CardTitle>Bienvenido a SAMJU Talleres</CardTitle>
              <CardDescription>
                Este espacio está reservado para el equipo del taller.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                Sesión iniciada como{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
