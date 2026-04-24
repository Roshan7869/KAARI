'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Smartphone, ShieldCheck, XCircle } from 'lucide-react';
import Image from 'next/image';
import { UPI_APPS } from '@/lib/cashfree-sdk';
import { usePaymentSession } from './usePaymentSession';
import { usePaymentProcessing } from './usePaymentProcessing';
import { PaymentStatusView } from './PaymentStatusView';

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const cfSessionId = searchParams.get('cf_session_id');
  const {
    loading,
    session,
    error,
    paymentStatus,
    isCashfreeMode,
    isDummyMode,
    setPaymentStatus,
    setError,
  } = usePaymentSession({
    sessionId,
    cfSessionId,
    router,
  });

  const { processingStep, handleUPIAppSelect, handleDummyPayment } = usePaymentProcessing({
    session,
    sessionId,
    isDummyMode,
    paymentStatus,
    setPaymentStatus,
    setError,
    router,
  });

  const processingSteps = [
    'Initializing secure connection...',
    'Verifying payment details...',
    'Connecting to UPI gateway...',
    'Processing transaction...',
  ];
  const progressWidthClasses = ['w-1/4', 'w-2/4', 'w-3/4', 'w-full'] as const;

  return (
    <PaymentStatusView
      loading={loading}
      isCashfreeMode={isCashfreeMode}
      error={error}
      session={session}
      paymentStatus={paymentStatus}
      router={router}
    >
      <div className="min-h-screen py-8 md:py-12 px-4 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-lg mx-auto space-y-6">
        {/* Test mode banner */}
        {isDummyMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded px-4 py-2 text-sm font-medium">
            Test mode: no real payment will be processed
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
                ₹{(session?.amount ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="font-body text-xs text-muted-foreground mt-2">
                Order: {session?.orderId?.slice(0, 8)}...
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
                  Pay ₹{(session?.amount ?? 0).toLocaleString('en-IN')} (Test Mode)
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
                <Button onClick={() => router.push('/payment-failed?order_id=' + (session?.orderId ?? ''))} variant="outline" className="w-full">
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
    </PaymentStatusView>
  );
}

function PaymentPageInner() {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="font-display text-2xl mb-2">Payment Error</h2>
            <p className="font-body text-muted-foreground mb-4">An error occurred during payment. Our team has been notified.</p>
            <a href="/cart" className="text-primary underline">Return to Cart</a>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-background">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <PaymentContent />
        </Suspense>
      </div>
    </Sentry.ErrorBoundary>
  );
}

export default PaymentPageInner;
