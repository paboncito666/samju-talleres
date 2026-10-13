"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CargaMecanico } from "@/types";
import { ESTADOS } from "@/lib/estados";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";

export interface CargaMecanicosChartProps {
  datos: CargaMecanico[];
}

export function CargaMecanicosChart({ datos }: CargaMecanicosChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Carga de trabajo por mecánico</CardTitle>
      </CardHeader>
      <CardContent>
        {datos.length > 0 ? (
          <div className="h-72 w-full min-w-0" role="img" aria-label="Carga de trabajo por mecánico">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datos}
                margin={{ top: 4, right: 8, left: -18, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="mecanico"
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
                  formatter={(value, name) => [
                    value,
                    name === "en_reparacion" ? "En reparación" : "Total activas",
                  ]}
                  labelFormatter={(label) => `Mecánico: ${label}`}
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: "var(--line)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="en_reparacion"
                  name="En reparación"
                  fill={ESTADOS.REPARACION.color}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="total_activos"
                  name="Total activas"
                  fill={ESTADOS.RECIBIDO.color}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            className="border-0 bg-transparent py-10"
            title="Sin mecánicos asignados"
            description="La carga de trabajo aparecerá al asignar órdenes."
          />
        )}
      </CardContent>
    </Card>
  );
}
