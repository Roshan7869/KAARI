'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { OrderSummarySkeleton } from '@/components/ui/skeleton-loader';

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  payment_status: string | null;
  created_at: string;
  checkout_sessions: {
    payment_method: string | null;
    shipping_name: string | null;
    shipping_line1: string | null;
    shipping_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  payments: Array<{
    id: string;
    status: string;
    provider: string;
  }> | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    products: { title: string } | null;
  }>;
}

export default function OrderConfirmation() {
  const params = useParams();
  const orderId = params?.orderId as string | undefined;

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID');
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          payment_status,
          created_at,
          checkout_sessions(
            payment_method,
            shipping_name,
            shipping_line1,
            shipping_line2,
            city,
            state,
            postal_code,
            country,
            phone,
            email
          ),
          payments(
            id,
            status,
            provider
          ),
          order_items(
            id,
            quantity,
            unit_price,
            line_total,
            products(title)
          )
        `)
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!orderId,
  });

  if (isLoading || !orderId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <OrderSummarySkeleton />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-display text-2xl mb-4">Order Not Found</h2>
            <p className="font-body text-muted-foreground mb-4">
              {`We couldn't find your order. Please contact support.`}
            </p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl mb-2">Order Confirmed!</h1>
          <p className="font-body text-muted-foreground">
            Thank you for your purchase
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Order #{order.order_number || order.id.slice(0, 8)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between font-body">
              <span className="text-muted-foreground">Date</span>
              <span>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between font-body">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{order.status}</span>
            </div>
            <div className="flex justify-between font-body">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="text-right">
                {order.checkout_sessions?.payment_method === 'cod'
                  ? 'Cash on Delivery'
                  : order.checkout_sessions?.payment_method || order.payments?.[0]?.provider || 'N/A'}
                {(order.payment_status || order.payments?.[0]?.status) && (
                  <span className="block text-sm text-muted-foreground">
                    Status: {order.payment_status || order.payments?.[0]?.status}
                  </span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-xl">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order?.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between font-body">
                  <div>
                    <span>{item.products?.title || 'Product'}</span>
                    <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                  </div>
                  <span>₹{(item.unit_price || item.line_total).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 flex justify-between font-display text-lg">
              <span>Total</span>
              <span>₹{(order?.total_amount || 0).toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>

        {order?.checkout_sessions && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-xl">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-body space-y-1">
                <p>{order.checkout_sessions.shipping_name || ''}</p>
                <p className="text-muted-foreground">
                  {[order.checkout_sessions.shipping_line1, order.checkout_sessions.shipping_line2]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="text-muted-foreground">
                  {[order.checkout_sessions.city, order.checkout_sessions.state, order.checkout_sessions.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="text-muted-foreground">
                  {order.checkout_sessions.country || ''}
                </p>
                {(order.checkout_sessions.phone || order.checkout_sessions.email) && (
                  <p className="text-muted-foreground text-sm">
                    {order.checkout_sessions.phone ? `Phone: ${order.checkout_sessions.phone}` : ''}
                    {order.checkout_sessions.phone && order.checkout_sessions.email ? ' • ' : ''}
                    {order.checkout_sessions.email ? `Email: ${order.checkout_sessions.email}` : ''}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link href="/products">
            <Button size="lg">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
