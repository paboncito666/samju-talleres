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

export interface TiempoReparacionChartProps {
  datos: CargaMecanico[];
}

export function TiempoReparacionChart({ datos }: TiempoReparacionChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tiempo promedio de reparación</CardTitle>
      </CardHeader>
      <CardContent>
        {datos.length > 0 ? (
          <div className="h-72 w-full min-w-0" role="img" aria-label="Tiempo promedio de reparación por mecánico en días">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datos}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--line)" horizontal={false} />
                <XAxis
                  type="number"
                  unit=" días"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="mecanico"
                  width={112}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} días`, "Promedio"]}
                  labelFormatter={(label) => `Mecánico: ${label}`}
                  contentStyle={{
                    borderRadius: 10,
                    borderColor: "var(--line)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="promedio_dias"
                  name="Promedio"
                  fill={ESTADOS.CALIDAD.color}
                  radius={[0, 5, 5, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            className="border-0 bg-transparent py-10"
            title="Sin tiempos registrados"
            description="El promedio aparecerá cuando haya órdenes asignadas."
          />
        )}
      </CardContent>
    </Card>
  );
}
