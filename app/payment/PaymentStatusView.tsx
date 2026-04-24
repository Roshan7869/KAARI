'use client';

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentSession, PaymentStatus } from './types';
import { ReactNode } from 'react';

export function PaymentStatusView({
  loading,
  isCashfreeMode,
  error,
  session,
  paymentStatus,
  router,
  children,
}: {
  loading: boolean;
  isCashfreeMode: boolean;
  error: string | null;
  session: PaymentSession | null;
  paymentStatus: PaymentStatus;
  router: AppRouterInstance;
  children: ReactNode;
}) {
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

  return <>{children}</>;
}
