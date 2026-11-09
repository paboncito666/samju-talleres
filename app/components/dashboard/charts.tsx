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
            <CartesianGrid stroke="#e4e8e5" strokeDasharray="4 5" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#718078" }} interval={0} angle={-20} textAnchor="end" height={52} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#718078" }} />
            <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e4e8e5", boxShadow: "0 12px 30px -18px rgba(27,54,42,0.35)" }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>{byStatus.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Carga activa por mecánico">
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={byMechanic} margin={{ left: -18, right: 12, top: 8 }}>
            <CartesianGrid stroke="#e4e8e5" strokeDasharray="4 5" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#718078" }} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#718078" }} />
            <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e4e8e5", boxShadow: "0 12px 30px -18px rgba(27,54,42,0.35)" }} />
            <Bar dataKey="total" fill="#6d927b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="admin-reveal rounded-3xl border border-line bg-white p-5 shadow-[0_12px_35px_-28px_rgba(37,41,39,0.35)] transition duration-300 hover:shadow-soft sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-ink">{title}</h2><span aria-hidden="true" className="size-2 rounded-full bg-emerald-700 ring-4 ring-emerald-50" /></div><div className="mt-4 rounded-2xl bg-background/70 p-2">{children}</div></section>;
}
