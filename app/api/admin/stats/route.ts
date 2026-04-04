import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/verify-jwt';
import { logger } from '@/lib/logger';
import { AdminStatsSchema } from '@/lib/validations/admin.schema';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    // Validate query params with Zod
    const queryData = Object.fromEntries(searchParams);
    const result = AdminStatsSchema.safeParse(queryData);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.errors,
        },
        { status: 400 }
      );
    }
    const { period, page, limit } = result.data;

    // Get total counts
    const { count: totalProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    const { count: totalOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });

    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const { data: totalRevenue } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('status', 'paid');

    // Get recent orders (last 10)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        created_at,
        user:profiles (id, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get order status distribution
    const { data: orderStatusCounts } = await supabase
      .from('orders')
      .select('status');

    const orderStatusDistribution: Record<string, number> = {};
    orderStatusCounts?.forEach((curr: { status: string }) => {
      orderStatusDistribution[curr.status] = (orderStatusDistribution[curr.status] || 0) + 1;
    });

    // Get today's stats
    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .gte('created_at', todayStart)
      .limit(100); // Limit for performance

    // Calculate today's revenue - handle null values properly
    const todayRevenue = todayOrders?.reduce((sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0), 0) ?? 0;
    const todayOrderCount = todayOrders?.length ?? 0;

    // Calculate total revenue - handle null values properly
    const totalRevenueAmount = totalRevenue?.reduce((sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0), 0) ?? 0;

    // Combine all stats
    const stats = {
      totalProducts: totalProducts ?? 0,
      totalOrders: totalOrders ?? 0,
      totalCustomers: totalCustomers ?? 0,
      totalRevenue: totalRevenueAmount,
      orderStatusDistribution,
      today: {
        orders: todayOrderCount,
        revenue: todayRevenue,
      },
      recentOrders: recentOrders ?? [],
    };

    logger.info('Admin stats retrieved');

    // Handle endpoint-specific queries
    if (endpoint === 'products') {
      // Total products by category
      const { data: productsByCategory } = await supabase
        .from('products')
        .select('category')
        .is('is_active', true);

      const categoryDistribution: Record<string, number> = {};
      productsByCategory?.forEach((curr: { category: string | null }) => {
        const cat = curr.category ?? 'uncategorized';
        categoryDistribution[cat] = (categoryDistribution[cat] ?? 0) + 1;
      });

      // Best selling products (by order items)
      const { data: bestSellers } = await supabase
        .from('order_items')
        .select(`
          product_id,
          product:products (title, base_price),
          quantity
        `);

      const productStats = {
        byCategory: categoryDistribution,
        bestSellers: bestSellers ?? [],
      };

      logger.info('Product stats retrieved');

      return NextResponse.json({
        success: true,
        data: productStats,
      });
    }

    if (endpoint === 'revenue') {
      // Use the period from validated schema (already parsed at the top)
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .eq('status', 'paid');

      // Group by period
      const revenueByPeriod: Record<string, { total: number; count: number }> = {};
      orders?.forEach((order: { total_amount: number | null; created_at: string }) => {
        const date = new Date(order.created_at);
        let key = '';

        switch (period) {
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            // Calculate week number
            const d = new Date(date);
            d.setUTCDate(d.getUTCDate() + 4 - d.getUTCDay());
            const year = d.getUTCFullYear();
            const week = Math.ceil((((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1) / 7);
            key = `${year}-W${week}`;
            break;
          case 'month':
            key = date.toISOString().slice(0, 7);
            break;
          case 'year':
            key = date.toISOString().slice(0, 4);
            break;
        }

        if (!revenueByPeriod[key]) revenueByPeriod[key] = { total: 0, count: 0 };
        revenueByPeriod[key].total += order.total_amount ?? 0;
        revenueByPeriod[key].count += 1;
      });

      // Calculate total revenue - handle null values properly
      const totalRevenue = orders?.reduce((sum: number, o: { total_amount: number | null }) => sum + (o.total_amount ?? 0), 0) ?? 0;
      const totalOrders = orders?.length ?? 0;

      logger.info('Revenue stats retrieved', { period });

      return NextResponse.json({
        success: true,
        data: {
          revenueByPeriod,
          totalRevenue,
          totalOrders,
        },
      });
    }

    // Default: return all stats
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get admin stats', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch admin stats',
      },
      { status: 500 }
    );
  }
}
