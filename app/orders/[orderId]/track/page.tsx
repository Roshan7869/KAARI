import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { CheckCircle2, Circle, Package, ArrowLeft, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Track Order | Kaari',
  description: 'Track your order status',
};

type OrderWithEvents = {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipping_provider_label?: string | null;
  order_status_events: {
    id: string;
    new_status: string;
    created_at: string;
    note?: string | null;
  }[];
};

const TIMELINE_STEPS = [
  { status: 'placed', label: 'Order Placed', description: 'Your order has been received' },
  { status: 'paid', label: 'Payment Confirmed', description: 'We received your payment' },
  { status: 'in_production', label: 'Being Made', description: 'Your item is being handcrafted' },
  { status: 'ready_to_ship', label: 'Ready to Ship', description: 'Packed and ready for pickup' },
  { status: 'shipped', label: 'Shipped', description: 'On its way to you' },
  { status: 'delivered', label: 'Delivered', description: 'Arrived at your door' },
];

const STATUS_ORDER = [
  'placed', 'awaiting_review', 'quote_pending', 'payment_pending',
  'paid', 'in_production', 'ready_to_ship', 'shipped', 'delivered',
];

function getStepIndex(status: string): number {
  // Map intermediate statuses to timeline steps
  const statusToStep: Record<string, number> = {
    placed: 0,
    awaiting_review: 0,
    quote_pending: 0,
    payment_pending: 1,
    paid: 1,
    in_production: 2,
    ready_to_ship: 3,
    shipped: 4,
    delivered: 5,
  };
  return statusToStep[status] ?? 0;
}

function getEventForStep(
  events: OrderWithEvents['order_status_events'],
  stepStatus: string[]
): OrderWithEvents['order_status_events'][0] | undefined {
  return events.find((e) => stepStatus.includes(e.new_status));
}

export default async function TrackOrderPage({
  params,
}: {
  params: { orderId: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect(`/login?redirect_url=/orders/${params.orderId}/track`);

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, total_amount, created_at, user_id,
      tracking_number, tracking_url, shipping_provider_label,
      order_status_events(id, new_status, created_at, note)
    `)
    .eq('id', params.orderId)
    .single() as unknown as { data: OrderWithEvents | null; error: Error | null };

  if (error || !order) return notFound();
  if (order.user_id !== userId) return notFound();

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const currentStepIndex = isCancelled ? -1 : getStepIndex(order.status);
  const displayId = order.order_number ?? order.id.slice(0, 8).toUpperCase();

  const stepToStatuses: Record<number, string[]> = {
    0: ['placed', 'awaiting_review'],
    1: ['payment_pending', 'paid', 'quote_pending'],
    2: ['in_production'],
    3: ['ready_to_ship'],
    4: ['shipped'],
    5: ['delivered'],
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl text-foreground">Order #{displayId}</h1>
              <p className="font-body text-sm text-muted-foreground mt-0.5">
                ₹{order.total_amount.toLocaleString('en-IN')} ·{' '}
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          </div>
        </div>

        {/* Cancelled state */}
        {isCancelled ? (
          <div className="border border-red-200 rounded-xl p-6 bg-red-50 text-center">
            <p className="font-body font-medium text-red-800 capitalize">{order.status}</p>
            <p className="font-body text-sm text-red-600 mt-1">
              This order has been {order.status}.
            </p>
          </div>
        ) : (
          /* Timeline */
          <div className="border rounded-xl p-6 bg-card">
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const event = getEventForStep(order.order_status_events, stepToStatuses[index] ?? []);
                const isLast = index === TIMELINE_STEPS.length - 1;

                return (
                  <div key={step.status} className="flex gap-4">
                    {/* Icon + connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isCompleted
                            ? isCurrent
                              ? 'bg-foreground text-background'
                              : 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 my-1 min-h-[2rem] ${
                            isCompleted && index < currentStepIndex ? 'bg-green-500' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                      <p
                        className={`font-body font-medium ${
                          isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                      {event ? (
                        <p className="font-body text-xs text-muted-foreground mt-0.5">
                          {new Date(event.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {event.note && ` · ${event.note}`}
                        </p>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking link */}
        {order.tracking_number && (
          <div className="mt-4 border rounded-xl p-4 bg-card">
            <p className="font-body text-sm font-medium text-foreground">Tracking Number</p>
            <div className="flex items-center justify-between mt-1">
              <p className="font-body text-sm text-muted-foreground">{order.tracking_number}</p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-body text-sm text-foreground hover:underline"
                >
                  Track Package <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {order.shipping_provider_label && (
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                via {order.shipping_provider_label}
              </p>
            )}
          </div>
        )}

        {/* Return option for delivered orders */}
        {order.status === 'delivered' && (
          <div className="mt-4 border rounded-xl p-4 bg-card flex items-center justify-between">
            <div>
              <p className="font-body text-sm font-medium text-foreground">Not happy with your order?</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                Returns accepted within 7 days of delivery
              </p>
            </div>
            <Link
              href={`/orders/${order.id}/return`}
              className="font-body text-sm text-foreground underline hover:opacity-70 transition-opacity"
            >
              Request Return
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
