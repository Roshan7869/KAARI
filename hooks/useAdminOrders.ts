import { logger } from '@/lib/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type OrderStatusEvent = Tables<'order_status_events'>;
export type Profile = Tables<'profiles'>;
export type CheckoutSession = Tables<'checkout_sessions'>;
export type Payment = Tables<'payments'>;
export type Product = Tables<'products'>;

// Order status type
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Extended order item with product info
export interface OrderItemWithProduct extends OrderItem {
  product: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

// Extended order with related data
export interface OrderWithDetails extends Order {
  items: OrderItemWithProduct[];
  customer: Profile | null;
  checkoutSession: CheckoutSession | null;
  payment: Payment | null;
}

// Status event with actor info
export interface StatusEventWithActor extends OrderStatusEvent {
  actor: {
    id: string;
    full_name: string | null;
  } | null;
  // Type alias for compatibility - map new_status to status
  status: string;
}

/**
 * Hook to fetch a single order with all related data
 */
export function useAdminOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: async (): Promise<OrderWithDetails | null> => {
      if (!orderId) return null;

      // Fetch order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        logger.error('Error fetching order:', orderError);
        throw orderError;
      }

      if (!order) return null;

      // Fetch order items with product info
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(id, title, slug)
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        logger.error('Error fetching order items:', itemsError);
        throw itemsError;
      }

      // Fetch customer profile
      const { data: customer, error: customerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', order.user_id)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        logger.error('Error fetching customer:', customerError);
        throw customerError;
      }

      // Fetch checkout session for shipping info
      let checkoutSession: CheckoutSession | null = null;
      if (order.checkout_session_id) {
        const { data: session, error: sessionError } = await supabase
          .from('checkout_sessions')
          .select('*')
          .eq('id', order.checkout_session_id)
          .single();

        if (sessionError && sessionError.code !== 'PGRST116') {
          logger.error('Error fetching checkout session:', sessionError);
        }
        checkoutSession = session;
      }

      // Fetch payment info
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (paymentsError) {
        logger.error('Error fetching payments:', paymentsError);
      }

      return {
        ...order,
        items: (items || []).map((item) => ({
          ...item,
          product: item.product as OrderItemWithProduct['product'],
        })),
        customer,
        checkoutSession,
        payment: payments?.[0] || null,
      };
    },
    enabled: !!orderId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to fetch order status history
 */
export function useOrderStatusHistory(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-status-history', orderId],
    queryFn: async (): Promise<StatusEventWithActor[]> => {
      if (!orderId) return [];

      const { data: events, error } = await supabase
        .from('order_status_events')
        .select(`
          *,
          actor:profiles!order_status_events_actor_user_id_fkey(id, full_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching status history:', error);
        throw error;
      }

      return (events || []).map((event) => ({
        ...event,
        status: event.new_status,
        actor: event.actor as StatusEventWithActor['actor'],
      }));
    },
    enabled: !!orderId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      previousStatus: _previousStatus,
      notes,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      previousStatus: string;
      notes?: string;
    }) => {
      if (!clerkUser) {
        throw new Error('Not authenticated');
      }

      // Update order status via API route (uses admin client server-side)
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update order status');
      }

      return { orderId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-status-history', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order status updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    },
  });
}

/**
 * Hook to fetch all orders for admin list view
 */
export function useAdminOrders(params: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { search, status, paymentStatus, page = 1, limit = 20 } = params;

  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(
          `
          *,
          profiles:user_id(id, full_name, phone)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`order_number.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching orders:', error);
        throw error;
      }

      return {
        orders: data || [],
        total: count || 0,
        page,
        limit,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}