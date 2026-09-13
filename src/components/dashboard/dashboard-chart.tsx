"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DashboardChart({ data, labels }: {
  data: Array<{ label: string; sales: number; expenses: number; profit: number }>;
  labels: { sales: string; expenses: string; profit: string };
}) {
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sales" name={labels.sales} stroke="currentColor" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expenses" name={labels.expenses} stroke="currentColor" strokeWidth={2} strokeDasharray="6 4" dot={false} />
          <Line type="monotone" dataKey="profit" name={labels.profit} stroke="currentColor" strokeWidth={2} strokeDasharray="2 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
