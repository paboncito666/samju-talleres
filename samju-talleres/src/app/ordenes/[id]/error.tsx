"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export interface OrdenErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OrdenDetalleError({ error, reset }: OrdenErrorProps) {
  useEffect(() => {
    console.error("Error al cargar el detalle de la orden:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl">
      <Card role="alert">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="size-5 text-rose-foreground" />
            No se pudo cargar la orden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            {error.message || "Ocurrió un error inesperado. Intenta nuevamente."}
          </p>
          <Button onClick={reset}>Reintentar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
