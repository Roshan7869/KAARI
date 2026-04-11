import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createUserClient } from '@/lib/supabase/auth-client';
import { Package, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Orders | Kaari',
  description: 'View your order history and track your crochet orders',
};

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: { id: string }[];
};

const STATUS_STYLES: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-800',
  awaiting_review: 'bg-yellow-100 text-yellow-800',
  quote_pending: 'bg-orange-100 text-orange-800',
  payment_pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  in_production: 'bg-purple-100 text-purple-800',
  ready_to_ship: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  awaiting_review: 'Awaiting Review',
  quote_pending: 'Quote Pending',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  in_production: 'In Production',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default async function OrdersPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login?redirect_url=/orders');

  let supabase;
  try {
    supabase = await createUserClient();
  } catch (authError) {
    // JWT template not configured or auth session expired
    // Redirect user to sign in with a helpful return URL
    redirect('/login?reason=session-expired&returnTo=/orders');
  }
  if (!supabase) redirect('/login?redirect_url=/orders');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, created_at, order_items(id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50) as unknown as { data: OrderRow[] | null; error: Error | null };

  if (error) {
    console.error('Failed to fetch orders:', error);
  }

  const orderList = orders ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-foreground">My Orders</h1>
          <p className="font-body text-muted-foreground mt-1">
            Track and manage your handmade crochet orders
          </p>
        </div>

        {orderList.length === 0 ? (
          <div className="text-center py-20 border rounded-xl">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-display text-xl text-foreground mb-2">No orders yet</h2>
            <p className="font-body text-muted-foreground mb-6">
              When you place an order, it will appear here.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-lg font-body text-sm hover:opacity-80 transition-opacity"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orderList.map((order) => {
              const statusStyle = STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-800';
              const statusLabel = STATUS_LABELS[order.status] ?? order.status;
              const itemCount = order.order_items?.length ?? 0;
              const displayId = order.order_number ?? order.id.slice(0, 8).toUpperCase();

              return (
                <div
                  key={order.id}
                  className="border rounded-xl p-5 bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-body font-semibold text-foreground">#{displayId}</p>
                      <p className="font-body text-sm text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {itemCount > 0 && ` · ${itemCount} item${itemCount > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle}`}>
                        {statusLabel}
                      </span>
                      <p className="font-body font-semibold text-foreground mt-1.5">
                        ₹{order.total_amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 border-t pt-3">
                    <Link
                      href={`/orders/${order.id}/track`}
                      className="flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Track Order <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
