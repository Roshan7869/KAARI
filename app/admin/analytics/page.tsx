import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { RevenueLineChart } from '@/components/admin/charts/RevenueLineChart';
import { OrderStatusPieChart } from '@/components/admin/charts/OrderStatusPieChart';
import { TopProductsBarChart } from '@/components/admin/charts/TopProductsBarChart';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | Kaari',
  robots: { index: false, follow: false },
};

async function AnalyticsContent() {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  interface RevenueRow { created_at: string; total_amount: number | null }
  interface StatusRow { status: string }
  interface OrderItemRow { product_name: string | null; quantity: number | null }

  // Revenue last 30 days
  const { data: revenueDataRaw } = await supabase
    .from('orders')
    .select('created_at, total_amount')
    .eq('status', 'paid')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true });
  const revenueData = (revenueDataRaw ?? []) as RevenueRow[];

  // suppress unused warning
  void sevenDaysAgo;

  // Group revenue by date
  const revenueByDate = revenueData.reduce<Record<string, { date: string; revenue: number; orders: number }>>((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (!acc[date]) acc[date] = { date, revenue: 0, orders: 0 };
    acc[date].revenue += Number(order.total_amount || 0);
    acc[date].orders += 1;
    return acc;
  }, {});

  const chartRevenueData = Object.values(revenueByDate);

  // Orders by status count
  const { data: statusDataRaw } = await supabase
    .from('orders')
    .select('status');
  const statusData = (statusDataRaw ?? []) as StatusRow[];

  const statusCounts = statusData.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const chartStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Top 10 products by units sold
  const { data: orderItemsRaw } = await supabase
    .from('order_items')
    .select('product_name, quantity')
    .limit(100);
  const orderItems = (orderItemsRaw ?? []) as OrderItemRow[];

  const productSales = orderItems.reduce<Record<string, { name: string; units: number; revenue: number }>>((acc, item) => {
    const name = item.product_name || 'Unknown';
    if (!acc[name]) acc[name] = { name: name.length > 30 ? name.slice(0, 30) + '...' : name, units: 0, revenue: 0 };
    acc[name].units += Number(item.quantity || 0);
    return acc;
  }, {});

  const chartProductData = Object.values(productSales)
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  // Summary stats
  const totalRevenue = chartRevenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = chartRevenueData.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
          <p className="text-sm text-[#8b7355]">Revenue (30d)</p>
          <p className="text-2xl font-bold text-[#2d1b0e]">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
          <p className="text-sm text-[#8b7355]">Paid Orders (30d)</p>
          <p className="text-2xl font-bold text-[#2d1b0e]">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
          <p className="text-sm text-[#8b7355]">Avg Order Value</p>
          <p className="text-2xl font-bold text-[#2d1b0e]">
            ₹{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString('en-IN') : 0}
          </p>
        </div>
      </div>

      {/* Revenue Line Chart */}
      <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
        <h2 className="text-lg font-semibold text-[#2d1b0e] mb-4">Revenue & Orders (Last 30 Days)</h2>
        <RevenueLineChart data={chartRevenueData} isLoading={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Pie Chart */}
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
          <h2 className="text-lg font-semibold text-[#2d1b0e] mb-4">Orders by Status</h2>
          <OrderStatusPieChart data={chartStatusData} isLoading={false} />
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
          <h2 className="text-lg font-semibold text-[#2d1b0e] mb-4">Top Products by Units Sold</h2>
          <TopProductsBarChart data={chartProductData} isLoading={false} />
        </div>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#e8ddd4] p-6 animate-pulse">
            <div className="h-4 bg-[#e8ddd4] rounded w-24 mb-2" />
            <div className="h-8 bg-[#e8ddd4] rounded w-32" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 animate-pulse h-80" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 animate-pulse h-80" />
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 animate-pulse h-80" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}