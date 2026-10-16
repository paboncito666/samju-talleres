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

export function DashboardCharts({
  byStatus,
  byMechanic,
}: {
  byStatus: { name: string; total: number; color: string }[];
  byMechanic: { name: string; total: number }[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Órdenes por estado">
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={byStatus} margin={{ left: -18, right: 12, top: 8 }}>
            <CartesianGrid stroke="#e4e8e5" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={52} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>{byStatus.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Carga activa por mecánico">
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={byMechanic} margin={{ left: -18, right: 12, top: 8 }}>
            <CartesianGrid stroke="#e4e8e5" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="total" fill="#a9b9ad" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-line bg-white p-5 shadow-soft"><h2 className="text-sm font-semibold text-ink">{title}</h2><div className="mt-4">{children}</div></section>;
}
