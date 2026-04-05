import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, CreditCard } from 'lucide-react';
import {
  getDummyPaymentSession,
  processPayment,
  type DummyPaymentSession,
} from '@/lib/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateRedirectUrl, validateOrderConfirmationUrl } from '@/lib/redirect';

export default function DummyPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const returnUrlParam = searchParams.get('return_url');

  const [session, setSession] = useState<DummyPaymentSession | null>(null);
  const [processing, setProcessing] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // SECURITY: Validate return URL to prevent open redirect attacks
  const safeReturnUrl = validateRedirectUrl(returnUrlParam);

  useEffect(() => {
    if (!sessionId) {
      setError('Invalid payment session');
      return;
    }

    // SECURITY: Check if user owns this order (session ownership verification)
    const verifyOwnership = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please log in to complete payment')
          setIsAuthorized(false)
          return
        }
        setUserId(user.id)

        const paymentSession = getDummyPaymentSession(sessionId)
        if (!paymentSession) {
          setError('Payment session expired or not found')
          setIsAuthorized(false)
          return
        }

        // SECURITY: Verify the order belongs to the current user
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('user_id, status')
          .eq('id', paymentSession.order_id)
          .maybeSingle()

        if (orderError || !order) {
          console.error('Order verification failed:', orderError)
          setError('Order not found')
          setIsAuthorized(false)
          return
        }

        if (order.user_id !== user.id) {
          // SECURITY: Log potential unauthorized access attempt
          console.warn('SECURITY: Unauthorized payment attempt', {
            sessionId,
            orderId: paymentSession.order_id,
            orderUserId: order.user_id,
            currentUserId: user.id
          })
          setError('You are not authorized to pay for this order')
          setIsAuthorized(false)
          return
        }

        // SECURITY: Verify order is in a payable state
        if (!['pending', 'processing'].includes(order.status)) {
          setError(`This order cannot accept payment (status: ${order.status})`)
          setIsAuthorized(false)
          return
        }

        setSession(paymentSession)
        setIsAuthorized(true)
      } catch (err) {
        console.error('Session verification error:', err)
        setError('Failed to verify payment session')
        setIsAuthorized(false)
      }
    }

    verifyOwnership()
  }, [sessionId])

  const handlePayment = async () => {
    if (!session) return;

    setProcessing(true);
    setError(null);

    try {
      // Simulate payment processing
      const result = await processPayment(sessionId!, {
        failureRate: simulateFailure ? 1 : 0,
        processingDelayMs: 2000,
      });

      if (!result.success) {
        // Payment failed - trigger webhook to update database
        await supabase.functions.invoke('payment-webhook', {
          body: {
            session_id: sessionId,
            order_id: session.order_id,
            status: 'failed',
            transaction_id: result.transactionId,
          },
        });

        setError(result.message);
        toast.error('Payment failed. Your order has been cancelled and inventory restored.');
        
        // Redirect back to checkout after delay
        setTimeout(() => {
          navigate('/checkout');
        }, 3000);
        return;
      }

      // Payment success - trigger webhook to update database
      const webhookResult = await supabase.functions.invoke('payment-webhook', {
        body: {
          session_id: sessionId,
          order_id: session.order_id,
          status: 'completed',
          transaction_id: result.transactionId,
        },
      });

      if (webhookResult.error) {
        throw webhookResult.error;
      }

      toast.success('Payment successful!');

      // SECURITY: Use validated redirect URL
      const redirectUrl = safeReturnUrl !== '/'
        ? safeReturnUrl
        : validateOrderConfirmationUrl(session.order_id);
      navigate(redirectUrl);
    } catch (err) {
      console.error('Payment processing error:', err);
      toast.error(err instanceof Error ? err.message : 'Payment processing failed');
      setError('Payment processing error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // SECURITY: Show loading while verifying authorization
  if (isAuthorized === null) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full fabric-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-muted-foreground">Verifying payment session...</p>
        </div>
      </main>
    );
  }

  if (!isAuthorized || !session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full fabric-card p-8 text-center">
          <AlertCircle className="mx-auto w-12 h-12 text-destructive mb-4" />
          <h1 className="font-display text-2xl text-foreground mb-2">Payment Error</h1>
          <p className="font-body text-muted-foreground mb-6">{error || 'Invalid payment session'}</p>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full px-6 py-3 bg-primary text-primary-foreground font-body text-sm font-semibold"
          >
            Back to Checkout
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Payment Gateway Card */}
        <div className="fabric-card p-8 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-6">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>

          <h1 className="font-display text-2xl text-foreground mb-2 text-center">
            Complete Payment
          </h1>
          <p className="font-body text-sm text-muted-foreground text-center mb-6">
            This is a dummy payment gateway for testing
          </p>

          {/* Order Details */}
          <div className="bg-secondary/50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between font-body text-sm">
              <span className="text-muted-foreground">Order ID</span>
              <span className="text-foreground font-medium">{session.order_id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground font-medium">₹{session.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-muted-foreground">Method</span>
              <span className="text-foreground font-medium capitalize">{session.payment_method}</span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-muted-foreground">Expires In</span>
              <span className="text-foreground font-medium">15 minutes</span>
            </div>
          </div>

          {/* Failure Simulation Toggle (Dev Only) */}
          <div className="border border-border rounded-lg p-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="font-body text-sm text-muted-foreground">Simulate payment failure</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6"
            >
              <p className="font-body text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full px-6 py-3 bg-primary text-primary-foreground font-body text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Payment
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/checkout')}
              disabled={processing}
              className="w-full px-6 py-3 border border-border text-foreground font-body text-sm font-semibold rounded-sm hover:bg-accent/10 disabled:opacity-50"
            >
              Cancel Payment
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-secondary/50 rounded-lg p-4 flex gap-3">
          <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-xs font-medium text-foreground mb-1">Demo Payment Gateway</p>
            <p className="font-body text-xs text-muted-foreground">
              This is a simulated payment flow. No real payment processing occurs.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
