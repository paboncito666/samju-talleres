"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

type VehiclePdfDetails = {
  make: string;
  model: string;
  plate: string;
  year: string;
  color: string;
  mileage: string;
};

type PdfWork = {
  description: string;
  type: string;
  completed: boolean;
  date: string;
};

type PdfPhoto = {
  stage: string;
  date: string;
  url: string | null;
};

type PdfOrderSummary = {
  number: string;
  status: string;
  description: string;
  serviceType: string;
  entryDate: string;
  estimatedDate: string;
  closingDate: string;
  mechanic: string;
  receptionist: string;
  observations: string;
  cancellationReason: string;
};

type PdfHistoryOrder = PdfOrderSummary & {
  works: PdfWork[];
  photos: PdfPhoto[];
};

type PdfDetailedOrder = PdfOrderSummary & {
  works: PdfWork[];
  photos: PdfPhoto[];
};

type PdfReport =
  | {
      kind: "order";
      fileName: string;
      vehicle: VehiclePdfDetails;
      order: PdfDetailedOrder;
    }
  | {
      kind: "history";
      fileName: string;
      vehicle: VehiclePdfDetails & { owner: string };
      orders: PdfHistoryOrder[];
    };

const margin = 18;
const lineHeight = 5;

export function PdfExportButton({
  report,
  label,
}: {
  report: PdfReport;
  label: string;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function exportPdf() {
    setIsExporting(true);
    setErrorMessage("");

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ format: "a4", unit: "mm" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (height: number) => {
        if (y + height > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const addTitle = (title: string, subtitle: string) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(19);
        pdf.setTextColor(37, 41, 39);
        pdf.text(title, margin, y);
        y += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(95, 103, 98);
        pdf.text(subtitle, margin, y);
        y += 6;

        pdf.setDrawColor(224, 230, 225);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;
      };

      const addSection = (title: string) => {
        ensureSpace(13);
        pdf.setFillColor(238, 241, 239);
        pdf.roundedRect(margin, y - 4, contentWidth, 9, 2, 2, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(37, 41, 39);
        pdf.text(title, margin + 3, y + 2);
        y += 11;
      };

      const addParagraph = (label: string, value: string) => {
        const normalizedValue = value.trim() || "Sin registro";
        const lines = pdf.splitTextToSize(normalizedValue, contentWidth - 2);
        ensureSpace((lines.length + 1) * lineHeight + 2);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(81, 89, 84);
        pdf.text(label, margin, y);
        y += lineHeight;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(37, 41, 39);
        for (const line of lines) {
          ensureSpace(lineHeight);
          pdf.text(line, margin, y);
          y += lineHeight;
        }
        y += 2;
      };

      const addVehicleDetails = (
        vehicle: VehiclePdfDetails,
        owner?: string,
      ) => {
        addSection("Vehículo");
        addParagraph("Vehículo", `${vehicle.make} ${vehicle.model}`);
        addParagraph("Placa", vehicle.plate);
        if (vehicle.year) addParagraph("Año", vehicle.year);
        if (vehicle.color) addParagraph("Color", vehicle.color);
        if (vehicle.mileage) addParagraph("Kilometraje", vehicle.mileage);
        if (owner) addParagraph("Propietario", owner);
      };

      const addOrderDetails = (order: PdfOrderSummary) => {
        addParagraph("Orden", order.number);
        addParagraph("Estado", order.status);
        addParagraph("Servicio solicitado", order.description);
        addParagraph("Tipo de servicio", order.serviceType);
        addParagraph("Fecha de ingreso", order.entryDate);
        if (order.estimatedDate) {
          addParagraph("Entrega estimada", order.estimatedDate);
        }
        if (order.closingDate) {
          addParagraph("Fecha de cierre", order.closingDate);
        }
        if (order.mechanic) addParagraph("Mecánico", order.mechanic);
        if (order.receptionist) {
          addParagraph("Recepcionista", order.receptionist);
        }
        if (order.observations) {
          addParagraph("Observaciones", order.observations);
        }
        if (order.cancellationReason) {
          addParagraph("Motivo de cancelación", order.cancellationReason);
        }
      };

      const addWorksAndPhotos = (
        works: PdfWork[],
        photos: PdfPhoto[],
      ) => {
        addSection("Trabajos realizados");
        if (works.length === 0) {
          addParagraph("Trabajos", "No se registraron trabajos.");
        } else {
          for (const work of works) {
            addParagraph(
              work.completed ? "Trabajo completado" : "Trabajo pendiente",
              `${work.description} · ${work.type}${work.date ? ` · ${work.date}` : ""}`,
            );
          }
        }

        addSection("Fotografías");
        if (photos.length === 0) {
          addParagraph("Fotos", "No se registraron fotografías.");
        } else {
          for (const photo of photos) {
            ensureSpace(8);
            const description = `${photo.stage} · ${photo.date}`;
            if (photo.url) {
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(10);
              pdf.setTextColor(37, 41, 39);
              pdf.textWithLink(description, margin, y, { url: photo.url });
              pdf.setTextColor(48, 91, 73);
              pdf.textWithLink("Abrir foto", margin + 100, y, {
                url: photo.url,
              });
            } else {
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(10);
              pdf.setTextColor(37, 41, 39);
              pdf.text(description, margin, y);
            }
            y += lineHeight + 2;
          }
        }
      };

      if (report.kind === "order") {
        addTitle("Resumen de orden de trabajo", "SAMJU Talleres");
        addVehicleDetails(report.vehicle);
        addSection("Detalle de la orden");
        addOrderDetails(report.order);
        addWorksAndPhotos(report.order.works, report.order.photos);
      } else {
        addTitle("Historial del vehículo", "SAMJU Talleres");
        addVehicleDetails(report.vehicle, report.vehicle.owner);
        addSection("Resumen del historial");
        addParagraph("Órdenes cerradas", String(report.orders.length));
        addParagraph(
          "Trabajos registrados",
          String(
            report.orders.reduce((total, order) => total + order.works.length, 0),
          ),
        );
        addParagraph(
          "Fotografías registradas",
          String(
            report.orders.reduce(
              (total, order) => total + order.photos.length,
              0,
            ),
          ),
        );

        if (report.orders.length === 0) {
          addParagraph("Historial", "No hay órdenes cerradas registradas.");
        }

        for (const order of report.orders) {
          addSection(`Orden ${order.number} · ${order.status}`);
          addOrderDetails(order);
          addWorksAndPhotos(order.works, order.photos);
        }
      }

      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(120, 126, 122);
        pdf.text(
          `Generado ${new Intl.DateTimeFormat("es-MX", {
            dateStyle: "medium",
          }).format(new Date())} · Página ${page} de ${pageCount}`,
          margin,
          pageHeight - 8,
        );
      }

      pdf.save(report.fileName);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `No se pudo generar el PDF: ${error.message}`
          : "No se pudo generar el PDF por un error inesperado.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-mist disabled:cursor-wait disabled:opacity-60"
        disabled={isExporting}
        onClick={exportPdf}
        type="button"
      >
        {isExporting ? (
          <FileText aria-hidden="true" size={16} />
        ) : (
          <Download aria-hidden="true" size={16} />
        )}
        {isExporting ? "Generando PDF..." : label}
      </button>
      {errorMessage && (
        <p aria-live="assertive" className="max-w-xs text-xs text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
