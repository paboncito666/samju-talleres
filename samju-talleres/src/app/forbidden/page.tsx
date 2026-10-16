import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-amber text-amber-foreground">
            <ShieldAlert aria-hidden="true" size={22} />
          </span>
          <CardTitle>Acceso no disponible</CardTitle>
          <CardDescription>
            Tu cuenta no tiene permiso para ver esta página, está inactiva o
            todavía no tiene un perfil asignado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            className="text-sm font-medium text-ink underline-offset-4 hover:underline"
            href="/login"
          >
            Volver al inicio de sesión
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
