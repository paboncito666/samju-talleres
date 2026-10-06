import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export interface HistorialEstadosProps {
  ordenId: string;
}

export function HistorialEstados({ ordenId }: HistorialEstadosProps) {
  return (
    <Card data-orden-id={ordenId}>
      <CardHeader>
        <CardTitle>Historial de estados</CardTitle>
        <CardDescription>Próximamente</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          El historial detallado de cambios estará disponible próximamente.
        </p>
      </CardContent>
    </Card>
  );
}
