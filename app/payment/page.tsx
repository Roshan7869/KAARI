'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Smartphone, CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getSecurePaymentSession, processSecurePayment } from '@/lib/payment-secure';
import { loadCashfreeSDK, UPI_APPS, type UPIApp, redirectUPIApp, getPaymentStatusWithBackoff } from '@/lib/cashfree-sdk';
import { getCashfreeCheckoutUrlAsync } from '@/lib/cashfree';
import { toast } from 'sonner';
import Image from 'next/image';

type PaymentStatus = 'idle' | 'loading-sdk' | 'processing' | 'polling' | 'success' | 'failed' | 'error';

interface PaymentSession {
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  expiresAt: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const cfSessionId = searchParams.get('cf_session_id');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [processingStep, setProcessingStep] = useState(0);
  const [isCashfreeMode, setIsCashfreeMode] = useState(false);
  const [isDummyMode, setIsDummyMode] = useState(false);

  // Load session on mount
  useEffect(() => {
    // If we have a Cashfree session, redirect to Cashfree hosted checkout
    if (cfSessionId) {
      setIsCashfreeMode(true);
      const redirect = async () => {
        try {
          const url = await getCashfreeCheckoutUrlAsync(cfSessionId);
          window.location.href = url;
        } catch {
          setError('Failed to redirect to payment gateway.');
          setLoading(false);
        }
      };
      redirect();
      return;
    }

    if (!sessionId) {
      setError('Invalid payment session. No session ID provided.');
      setLoading(false);
      return;
    }

    // Detect dummy mode from session ID prefix
    const isDummy = sessionId.startsWith('dummy_');
    setIsDummyMode(isDummy);

    const loadSession = async () => {
      try {
        const result = await getSecurePaymentSession(sessionId);

        if (!result.success || !result.session) {
          setError(result.error || 'Failed to load payment session');
          setLoading(false);
          return;
        }

        if (result.session.status === 'completed') {
          setPaymentStatus('success');
          setTimeout(() => {
            router.push(`/order-confirmation/${result.session!.orderId}`);
          }, 1500);
        } else if (result.session.status === 'failed') {
          setPaymentStatus('failed');
        } else if (result.session.status === 'expired') {
          setError('This payment session has expired. Please start a new checkout.');
        }

        setSession({
          sessionId: result.session.sessionId,
          orderId: result.session.orderId,
          amount: result.session.amount,
          currency: result.session.currency,
          status: result.session.status,
          paymentMethod: result.session.paymentMethod,
          expiresAt: result.session.expiresAt,
        });
      } catch {
        setError('Failed to load payment session. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, cfSessionId, router]);

  const simulateProcessing = useCallback(async () => {
    // This function should ONLY be called in dummy/demo mode
    // In production, Cashfree handles all processing — skip this delay
    if (process.env.NODE_ENV === 'production' && !isDummyMode) {
      console.warn('[Payment] simulateProcessing called in production — skipping');
      return;
    }

    const steps = [
      'Initializing secure connection...',
      'Verifying payment details...',
      'Connecting to UPI gateway...',
      'Processing transaction...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }, [isDummyMode]);

  // Handle UPI app deep link
  const handleUPIAppSelect = async (app: UPIApp) => {
    if (!session || paymentStatus === 'processing') return;

    setPaymentStatus('loading-sdk');
    setError(null);

    try {
      await loadCashfreeSDK();
      toast.info(`Opening ${app.name}...`);
      await redirectUPIApp(app, session.sessionId, session.amount);
      setPaymentStatus('polling');

      const pollResult = await getPaymentStatusWithBackoff(session.orderId, () => {
        // no-op callback for now, UI state is managed by terminal result
      });

      if (pollResult === 'completed') {
        setPaymentStatus('success');
        router.push(`/order-confirmation/${session.orderId}`);
        return;
      }

      if (pollResult === 'failed') {
        setPaymentStatus('failed');
        setError('Payment failed. Please try again.');
        return;
      }

      setPaymentStatus('failed');
      setError('Payment verification timed out. Please check order status and try again.');
    } catch {
      handleDummyPayment();
    }
  };

  // Handle dummy/development payment
  const handleDummyPayment = async () => {
    if (!sessionId || paymentStatus === 'processing') return;

    setPaymentStatus('processing');
    setError(null);

    try {
      // Only simulate processing steps in dummy/demo mode
      // In production, Cashfree handles all processing — skip this delay
      if (isDummyMode) {
        await simulateProcessing();
      }

      const result = await processSecurePayment(sessionId, {
        processingDelayMs: 500,
        failureRate: 0,
      });

      if (result.success) {
        setPaymentStatus('success');
        toast.success('Payment successful!');

        await new Promise(resolve => setTimeout(resolve, 1500));

        const targetOrderId = result.orderId || session?.orderId;
        if (targetOrderId) {
          router.push(`/order-confirmation/${targetOrderId}?transaction=${result.transactionId}`);
        }
      } else {
        setPaymentStatus('failed');
        toast.error(result.message || 'Payment failed. Please try again.');
      }
    } catch {
      setPaymentStatus('failed');
      setError('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-body text-muted-foreground">
            {isCashfreeMode ? 'Redirecting to payment gateway...' : 'Loading payment session...'}
          </p>
        </div>
      </div>
    );
  }

  // Error with no session
  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">Session Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/cart')} className="w-full">
              Return to Cart
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired session
  if (session && new Date(session.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">Session Expired</h2>
            <p className="text-muted-foreground mb-4">
              Your payment session has expired. Please start a new checkout.
            </p>
            <Button onClick={() => router.push('/cart')} className="w-full">
              Return to Cart
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-4">Redirecting to order confirmation...</p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No session
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">Invalid Session</h2>
            <p className="text-muted-foreground mb-4">Your payment session could not be found.</p>
            <Button onClick={() => router.push('/cart')} className="w-full">
              Return to Cart
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const processingSteps = [
    'Initializing secure connection...',
    'Verifying payment details...',
    'Connecting to UPI gateway...',
    'Processing transaction...',
  ];
  const progressWidthClasses = ['w-1/4', 'w-2/4', 'w-3/4', 'w-full'] as const;

  return (
    <div className="min-h-screen py-8 md:py-12 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Test mode banner */}
        {isDummyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded px-4 py-2 text-sm font-medium">
            ⚠️ Test Mode — No real payment will be processed
          </div>
        )}

        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl md:text-3xl mb-2">Secure Payment</h1>
          <p className="font-body text-muted-foreground">Complete your purchase via UPI</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span className="font-body">256-bit SSL Encryption</span>
          <span className="mx-2">•</span>
          <span className="font-body">PCI DSS Compliant</span>
        </div>

        {/* Amount Card */}
        <Card className="border-primary/20">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="font-body text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="font-display text-4xl font-bold text-primary">
                ₹{session.amount.toLocaleString('en-IN')}
              </p>
              <p className="font-body text-xs text-muted-foreground mt-2">
                Order: {session.orderId?.slice(0, 8)}...
              </p>
            </div>
          </CardContent>
        </Card>

        {/* UPI App Selection */}
        {(paymentStatus === 'idle' || paymentStatus === 'failed') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Pay with UPI
              </CardTitle>
              <CardDescription className="font-body">
                Select your preferred UPI app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {UPI_APPS.slice(0, 3).map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleUPIAppSelect(app)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden relative">
                      <Image
                        src={app.icon}
                        alt={app.name}
                        width={32}
                        height={32}
                        className="object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `<span class="text-xs font-bold">${app.name.charAt(0)}</span>`;
                        }}
                      />
                    </div>
                    <span className="font-body text-xs font-medium">{app.name}</span>
                  </button>
                ))}
              </div>

              {/* Pay Now Button (Dummy/test mode only — hidden in production) */}
              {isDummyMode && (
                <Button
                  onClick={handleDummyPayment}
                  size="lg"
                  className="w-full py-6 text-lg font-medium"
                >
                  Pay ₹{session.amount.toLocaleString('en-IN')} (Test Mode)
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing State */}
        {(paymentStatus === 'processing' || paymentStatus === 'loading-sdk' || paymentStatus === 'polling') && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-display text-lg mb-1">
                    {paymentStatus === 'loading-sdk' ? 'Connecting to UPI...' :
                     paymentStatus === 'polling' ? 'Waiting for payment...' :
                     'Processing Payment...'}
                  </p>
                  <p className="font-body text-sm text-muted-foreground animate-pulse">
                    {paymentStatus === 'processing'
                      ? (processingSteps[processingStep] || 'Finalizing...')
                      : paymentStatus === 'polling'
                        ? 'Complete payment in your UPI app'
                        : 'Please wait...'}
                  </p>
                </div>
                {paymentStatus === 'processing' && (
                  <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-primary rounded-full transition-all duration-500 ${progressWidthClasses[processingStep] ?? 'w-full'}`}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Failed */}
        {paymentStatus === 'failed' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-6 text-center">
              <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <h3 className="font-display text-lg mb-1">Payment Failed</h3>
              <p className="font-body text-sm text-muted-foreground mb-4">
                {error || 'Something went wrong. Please try again.'}
              </p>
              <div className="space-y-2">
                <Button onClick={() => { setPaymentStatus('idle'); setError(null); }} className="w-full">
                  Try Again
                </Button>
                <Button onClick={() => router.push('/payment-failed?order_id=' + session.orderId)} variant="outline" className="w-full">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel */}
        {(paymentStatus === 'idle' || paymentStatus === 'failed') && (
          <Button
            onClick={() => router.push('/checkout')}
            variant="ghost"
            className="w-full font-body text-muted-foreground"
          >
            Cancel &amp; Go Back
          </Button>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground font-body">
          Secured by Cashfree Payments. UPI payments only.
        </p>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <PaymentContent />
      </Suspense>
    </div>
  );
}
