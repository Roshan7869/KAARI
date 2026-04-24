'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StatusData {
  name: string;
  value: number;
}

const COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#10b981',
  processing: '#3b82f6',
  shipped: '#6366f1',
  delivered: '#059669',
  cancelled: '#ef4444',
};

export function OrderStatusPieChart({ data, isLoading }: { data: StatusData[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center text-[#8b7355]">
        Loading order status...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-[#8b7355]">
        No orders yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: '#8b7355' }}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] || '#8b4513'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#2d1b0e', border: '1px solid #8b4513', borderRadius: 6, color: '#fff' }}
          formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        <Legend wrapperStyle={{ color: '#8b7355' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}