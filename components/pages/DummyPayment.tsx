'use client';

import { logger } from '@/lib/logger';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CreditCard, Wallet, Smartphone, Building2, CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getSecurePaymentSession, processSecurePayment } from '@/lib/payment-secure';
import { toast } from 'sonner';

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';
type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed' | 'error';

interface PaymentSession {
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  expiresAt: string;
}

export default function DummyPayment() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [processingStep, setProcessingStep] = useState(0);
  const progressWidthClasses = ['w-1/4', 'w-2/4', 'w-3/4', 'w-full'] as const;

  useEffect(() => {
    if (!sessionId) {
      setError('Invalid payment session. No session ID provided.');
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        const result = await getSecurePaymentSession(sessionId);

        if (!result.success || !result.session) {
          setError(result.error || 'Failed to load payment session');
          setLoading(false);
          return;
        }

        // Check if session is already processed
        if (result.session.status === 'completed') {
          setPaymentStatus('success');
          // Redirect to confirmation
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
          expiresAt: result.session.expiresAt
        });
      } catch (err) {
        logger.error('Session load error:', err);
        setError('Failed to load payment session. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, router]);

  const simulateProcessing = useCallback(async () => {
    const steps = [
      'Initializing secure connection...',
      'Verifying payment details...',
      'Connecting to bank...',
      'Processing transaction...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }, []);

  const handlePayment = async () => {
    if (!sessionId || paymentStatus === 'processing') return;

    setPaymentStatus('processing');
    setError(null);

    try {
      await simulateProcessing();

      // Use secure payment processing (validates against database)
      const result = await processSecurePayment(sessionId, {
        processingDelayMs: 500,
        failureRate: 0, // No random failures for better UX in development
      });

      if (result.success) {
        setPaymentStatus('success');
        toast.success('Payment successful!');

        // Wait a moment before redirecting
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (result.orderId) {
          router.push(`/order-confirmation/${result.orderId}?transaction=${result.transactionId}`);
        } else if (session?.orderId) {
          router.push(`/order-confirmation/${session.orderId}?transaction=${result.transactionId}`);
        }
      } else {
        setPaymentStatus('failed');
        toast.error(result.message || 'Payment failed. Please try again.');
      }
    } catch (err) {
      logger.error('Payment error:', err);
      setPaymentStatus('failed');
      setError('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
    }
  };

  const paymentMethods: { id: PaymentMethod; name: string; icon: React.ReactNode; description: string }[] = [
    { id: 'upi', name: 'UPI', icon: <Smartphone className="h-5 w-5" />, description: 'Pay using any UPI app' },
    { id: 'card', name: 'Card', icon: <CreditCard className="h-5 w-5" />, description: 'Credit/Debit card' },
    { id: 'netbanking', name: 'Net Banking', icon: <Building2 className="h-5 w-5" />, description: 'All major banks' },
    { id: 'wallet', name: 'Wallet', icon: <Wallet className="h-5 w-5" />, description: 'Paytm, PhonePe, etc.' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
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

  // Session expired
  if (session && new Date(session.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">Session Expired</h2>
            <p className="text-muted-foreground mb-4">Your payment session has expired. Please start a new checkout.</p>
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

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl md:text-3xl mb-2">Secure Payment</h1>
          <p className="text-muted-foreground">Complete your purchase safely</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>256-bit SSL Encryption</span>
          <span className="mx-2">•</span>
          <span>PCI DSS Compliant</span>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono">{session.orderId?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Session ID</span>
              <span className="font-mono">{session.sessionId?.slice(0, 12)}...</span>
            </div>
            {/* SECURITY: Amount is fetched from database, not from URL or user input */}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Amount</span>
                <span className="text-2xl font-display font-bold">
                  ₹{session.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Amount verified from order database
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Select Payment Method</CardTitle>
            <CardDescription>Choose your preferred payment option</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => paymentStatus !== 'processing' && setSelectedMethod(method.id)}
                disabled={paymentStatus === 'processing'}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${paymentStatus === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`p-2 rounded-lg ${selectedMethod === method.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {method.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">{method.name}</h3>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedMethod === method.id ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {selectedMethod === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Processing State */}
        {paymentStatus === 'processing' && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium mb-1">Processing Payment...</p>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {[
                      'Initializing secure connection...',
                      'Verifying payment details...',
                      'Connecting to bank...',
                      'Processing transaction...',
                    ][processingStep] || 'Finalizing...'}
                  </p>
                </div>
                <div className="w-full max-w-xs h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-primary transition-all duration-500 ${progressWidthClasses[processingStep] ?? 'w-full'}`}
                  />
                </div>
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
              <p className="text-sm text-muted-foreground mb-4">
                Something went wrong. Please try again.
              </p>
              <Button onClick={() => setPaymentStatus('idle')} variant="outline" className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pay Button */}
        {(paymentStatus === 'idle' || paymentStatus === 'failed') && (
          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              size="lg"
              className="w-full py-6 text-lg font-medium"
              disabled={paymentStatus === 'failed'}
            >
              {paymentStatus === 'failed' ? (
                'Payment Failed'
              ) : (
                <>Pay ₹{session.amount.toLocaleString('en-IN')}</>
              )}
            </Button>

            <Button
              onClick={() => router.push('/checkout')}
              variant="outline"
              className="w-full"
              disabled={paymentStatus === 'failed'}
            >
              Cancel & Go Back
            </Button>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground">
          This is a test payment page. No real money will be deducted.
          In production, this will redirect to Cashfree payment gateway.
        </p>
      </div>
    </div>
  );
}