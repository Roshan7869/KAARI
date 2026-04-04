import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export type TimePeriod = 'today' | 'week' | 'month' | 'all';

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  pendingOrders: number;
}

export interface RecentOrder {
  id: string;
  order_number: string | null;
  status: string;
  customer_name: string | null;
  total_amount: number | null;
  created_at: string;
}

/**
 * Get the date filter for a given time period
 */
function getDateFilter(period: TimePeriod): string | null {
  const now = new Date();

  switch (period) {
    case 'today':
      // Current date at midnight
      return now.toISOString().split('T')[0];
    case 'week':
      // 7 days ago
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo.toISOString();
    case 'month':
      // 30 days ago
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return monthAgo.toISOString();
    case 'all':
    default:
      return null;
  }
}

/**
 * Hook to fetch dashboard metrics (revenue, orders, customers)
 */
export function useDashboardMetrics(period: TimePeriod = 'month') {
  return useQuery({
    queryKey: ['admin-dashboard-metrics', period],
    queryFn: async (): Promise<DashboardMetrics> => {
      const dateFilter = getDateFilter(period);

      // Run queries in parallel for better performance
      const [ordersResult, paymentsResult, profilesResult, pendingOrdersResult] = await Promise.all([
        // Get orders count (optionally filtered by date)
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dateFilter || '1970-01-01'),

        // Get completed payments sum (revenue) - only completed payments
        supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .gte('created_at', dateFilter || '1970-01-01'),

        // Get total customers count (all time - no date filter for customers)
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),

        // Get pending orders count
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', dateFilter || '1970-01-01'),
      ]);

      // Check for errors
      if (ordersResult.error) {
        logger.error('Error fetching orders count:', ordersResult.error);
        throw ordersResult.error;
      }
      if (paymentsResult.error) {
        logger.error('Error fetching payments:', paymentsResult.error);
        throw paymentsResult.error;
      }
      if (profilesResult.error) {
        logger.error('Error fetching profiles count:', profilesResult.error);
        throw profilesResult.error;
      }
      if (pendingOrdersResult.error) {
        logger.error('Error fetching pending orders:', pendingOrdersResult.error);
        throw pendingOrdersResult.error;
      }

      // Calculate total revenue from completed payments
      const totalRevenue = (paymentsResult.data || []).reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      );

      return {
        totalRevenue,
        totalOrders: ordersResult.count || 0,
        totalCustomers: profilesResult.count || 0,
        pendingOrders: pendingOrdersResult.count || 0,
      };
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch recent orders for the activity feed
 */
export function useRecentOrders(limit: number = 10) {
  return useQuery({
    queryKey: ['admin-recent-orders', limit],
    queryFn: async (): Promise<RecentOrder[]> => {
      // Fetch recent orders with customer info via profiles join
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ordersError) {
        logger.error('Error fetching recent orders:', ordersError);
        throw ordersError;
      }

      if (!orders || orders.length === 0) {
        return [];
      }

      // Get unique user IDs to fetch profiles
      const userIds = Array.from(new Set(orders.map((o) => o.user_id)));

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) {
        logger.error('Error fetching profiles for orders:', profilesError);
        // Don't throw - we can still show orders without customer names
      }

      // Create a map of user_id -> full_name
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.full_name])
      );

      // Combine orders with customer names
      const recentOrders: RecentOrder[] = orders.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        customer_name: profileMap.get(order.user_id) || 'Unknown Customer',
        total_amount: order.total_amount,
        created_at: order.created_at,
      }));

      return recentOrders;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format relative time (e.g., "2h ago", "Just now")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    // Format as date for older entries
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }
}

/**
 * Get status badge variant based on order status
 */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'delivered':
      return 'default';
    case 'processing':
    case 'shipped':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'cancelled':
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}