'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ProductData {
  name: string;
  units: number;
  revenue: number;
}

export function TopProductsBarChart({ data, isLoading }: { data: ProductData[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center text-[#8b7355]">
        Loading products...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-[#8b7355]">
        No sales data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8ddd4" />
        <XAxis type="number" stroke="#8b7355" fontSize={12} tickLine={false} />
        <YAxis type="category" dataKey="name" stroke="#8b7355" fontSize={11} tickLine={false} width={75} />
        <Tooltip
          contentStyle={{ backgroundColor: '#2d1b0e', border: '1px solid #8b4513', borderRadius: 6, color: '#fff' }}
          formatter={(value: number, name: string) => [
            name === 'units' ? value : `₹${value.toLocaleString('en-IN')}`,
            name === 'units' ? 'Units Sold' : 'Revenue',
          ]}
        />
        <Bar dataKey="units" fill="#8b4513" radius={[0, 4, 4, 0]} name="Units Sold" />
      </BarChart>
    </ResponsiveContainer>
  );
}