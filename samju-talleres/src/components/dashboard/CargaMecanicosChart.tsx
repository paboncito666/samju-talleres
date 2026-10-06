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
          <div className="h-72 w-full" role="img" aria-label="Carga de trabajo por mecánico">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datos}
                margin={{ top: 4, right: 8, left: -18, bottom: 8 }}
              >
                <CartesianGrid stroke="#E8E5E1" vertical={false} />
                <XAxis
                  dataKey="mecanico"
                  tick={{ fill: "#625C55", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#625C55", fontSize: 12 }}
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
                    borderColor: "#E8E5E1",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="en_reparacion"
                  name="En reparación"
                  fill="#F8DCCB"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="total_activos"
                  name="Total activas"
                  fill="#DCE6F2"
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
