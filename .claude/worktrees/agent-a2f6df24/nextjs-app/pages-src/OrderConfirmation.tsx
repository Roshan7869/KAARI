import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-confirmation', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total_amount, created_at')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <ErrorBoundary componentName="Order Confirmation">
        <div className="w-full max-w-2xl fabric-card p-8 md:p-10 text-center">
          <CheckCircle2 className="mx-auto w-16 h-16 text-green-600 mb-6" />
          <h1 className="font-display text-4xl text-foreground mb-3">Order Confirmed</h1>
          <p className="font-body text-muted-foreground mb-8">
            Thank you for your order. We have received your request and will start processing it shortly.
          </p>

          {isLoading ? (
            <p className="font-body text-muted-foreground">Loading order details...</p>
          ) : order ? (
            <div className="rounded-sm border border-border p-5 text-left mb-8">
              <p className="font-body text-sm text-muted-foreground mb-2">Order Number</p>
              <p className="font-display text-xl text-foreground mb-4">{order.order_number || order.id}</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="font-body text-xs uppercase tracking-wide text-muted-foreground mb-1">Status</p>
                  <p className="font-body text-sm text-foreground capitalize">{order.status}</p>
                </div>
                <div>
                  <p className="font-body text-xs uppercase tracking-wide text-muted-foreground mb-1">Payment</p>
                  <p className="font-body text-sm text-foreground capitalize">{order.payment_status || 'pending'}</p>
                </div>
                <div>
                  <p className="font-body text-xs uppercase tracking-wide text-muted-foreground mb-1">Total</p>
                  <p className="font-body text-sm text-foreground">₹{(order.total_amount || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="font-body text-muted-foreground mb-8">
              Your order has been submitted. We could not load detailed metadata right now.
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/products"
              className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
            >
              Continue Shopping
            </Link>
            <Link
              to="/"
              className="inline-block px-8 py-3 border border-border font-body text-sm tracking-[0.15em] uppercase text-foreground hover:bg-accent/10 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </ErrorBoundary>
    </main>
  );
}
