import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export interface ExportarPdfProps {
  ordenId: string;
}

export function ExportarPdf({ ordenId }: ExportarPdfProps) {
  return (
    <Card data-orden-id={ordenId}>
      <CardHeader>
        <CardTitle>Exportar PDF</CardTitle>
        <CardDescription>Próximamente</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          La exportación de esta orden estará disponible próximamente.
        </p>
      </CardContent>
    </Card>
  );
}
