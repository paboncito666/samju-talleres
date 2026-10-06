import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export interface NotasInternasProps {
  ordenId: string;
}

export function NotasInternas({ ordenId }: NotasInternasProps) {
  return (
    <Card data-orden-id={ordenId}>
      <CardHeader>
        <CardTitle>Notas internas</CardTitle>
        <CardDescription>Próximamente</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          La gestión de notas internas estará disponible próximamente.
        </p>
      </CardContent>
    </Card>
  );
}
