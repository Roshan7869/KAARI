'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export function RevenueLineChart({ data, isLoading }: { data: RevenueData[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center text-[#8b7355]">
        Loading revenue data...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-[#8b7355]">
        No revenue data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ddd4" />
        <XAxis dataKey="date" stroke="#8b7355" fontSize={12} tickLine={false} />
        <YAxis stroke="#8b7355" fontSize={12} tickLine={false} tickFormatter={(v: number) => `₹${v}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#2d1b0e', border: '1px solid #8b4513', borderRadius: 6, color: '#fff' }}
          labelStyle={{ color: '#e8ddd4' }}
          formatter={(value: number, name: string) => [
            name === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value,
            name === 'revenue' ? 'Revenue' : 'Orders',
          ]}
        />
        <Legend wrapperStyle={{ color: '#8b7355' }} />
        <Line type="monotone" dataKey="revenue" stroke="#8b4513" strokeWidth={2} dot={{ fill: '#8b4513', r: 3 }} name="Revenue" />
        <Line type="monotone" dataKey="orders" stroke="#d4a574" strokeWidth={2} dot={{ fill: '#d4a574', r: 3 }} name="Orders" />
      </LineChart>
    </ResponsiveContainer>
  );
}