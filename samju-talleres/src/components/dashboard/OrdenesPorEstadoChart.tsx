"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ESTADOS, type EstadoOrden } from "@/lib/estados";
import type { OrdenesPorEstado } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";

export interface OrdenesPorEstadoChartProps {
  datos: OrdenesPorEstado[];
}

export function OrdenesPorEstadoChart({
  datos,
}: OrdenesPorEstadoChartProps) {
  const hayDatos = datos.some((dato) => dato.cantidad > 0);
  const chartData = (Object.keys(ESTADOS) as EstadoOrden[])
    .filter((estado) => estado !== "ENTREGADO" && estado !== "CANCELADO")
    .map((estado) => ({
      estado,
      nombre: ESTADOS[estado].label,
      cantidad: datos.find((dato) => dato.estado === estado)?.cantidad ?? 0,
      color: ESTADOS[estado].color,
    }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Vehículos por estado</CardTitle>
      </CardHeader>
      <CardContent>
        {hayDatos ? (
          <div className="h-72 w-full min-w-0" role="img" aria-label="Órdenes activas por estado">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -18, bottom: 40 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="nombre"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [value, "Órdenes"]}
                  labelFormatter={(label) => `Estado: ${label}`}
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: "var(--line)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="cantidad" name="Órdenes" radius={[5, 5, 0, 0]}>
                  {chartData.map((dato) => (
                    <Cell key={dato.estado} fill={dato.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            className="border-0 bg-transparent py-10"
            title="Sin órdenes activas"
            description="Los datos por estado aparecerán cuando haya órdenes en curso."
          />
        )}
      </CardContent>
    </Card>
  );
}
