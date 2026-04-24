'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { initiatePayment } from '@/lib/payment';
import { toast } from 'sonner';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');

  const [retrying, setRetrying] = useState(false);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('id', orderId)
        .maybeSingle();

      if (data) setOrderAmount(data.total_amount);
    };

    fetchOrder();
  }, [orderId]);

  const handleRetry = async () => {
    if (!orderId || !orderAmount) return;

    setRetrying(true);
    try {
      const result = await initiatePayment(orderId, orderAmount, 'upi');

      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        toast.error(result.error || 'Failed to create new payment session');
      }
    } catch {
      toast.error('Failed to retry payment. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>

          {/* Message */}
          <div>
            <h1 className="font-display text-2xl mb-2">Payment Failed</h1>
            <p className="font-body text-muted-foreground">
              Your payment could not be processed. No money was deducted from your account.
            </p>
          </div>

          {/* Order Info */}
          {orderId && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between font-body text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono">{orderId.slice(0, 8)}...</span>
              </div>
              {orderAmount && (
                <div className="flex justify-between font-body text-sm mt-2">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-display font-semibold">
                    ₹{orderAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Common Reasons */}
          <div className="text-left bg-muted/60 border border-border rounded-lg p-4">
            <p className="font-body text-sm font-medium text-foreground mb-2">Common reasons:</p>
            <ul className="font-body text-sm text-muted-foreground space-y-1">
              <li>• UPI app was not opened or payment was declined</li>
              <li>• Insufficient balance in your account</li>
              <li>• Network issues during payment</li>
              <li>• Payment session expired (15 min limit)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {orderId && orderAmount && (
              <Button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full py-5"
                size="lg"
              >
                {retrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating new session...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Payment
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={() => router.push('/cart')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Cart
            </Button>
          </div>

          {/* Support */}
          <p className="font-body text-xs text-muted-foreground">
            Need help? Contact us at{' '}
            <a
              href="https://www.instagram.com/kaari.handmade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @kaari.handmade
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-background">
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
    </div>
  );
}
