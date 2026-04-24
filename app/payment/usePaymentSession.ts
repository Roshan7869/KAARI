'use client';

import { useEffect, useState } from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { getSecurePaymentSession } from '@/lib/payment';
import { PaymentSession, PaymentStatus } from './types';

async function fetchCheckoutUrl(sessionId: string, returnUrl?: string): Promise<string> {
  const params = new URLSearchParams({ session_id: sessionId });
  if (returnUrl) params.set('return_url', returnUrl);

  const res = await fetch(`/api/payment/checkout-url?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to fetch checkout URL' }));
    throw new Error(data.error || 'Failed to fetch checkout URL');
  }
  const data = await res.json() as { url: string };
  return data.url;
}

export function usePaymentSession({
  sessionId,
  cfSessionId,
  router,
}: {
  sessionId: string | null;
  cfSessionId: string | null;
  router: AppRouterInstance;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [isCashfreeMode, setIsCashfreeMode] = useState(false);
  const [isDummyMode, setIsDummyMode] = useState(false);

  useEffect(() => {
    if (cfSessionId) {
      setIsCashfreeMode(true);
      const redirect = async () => {
        try {
          const url = await fetchCheckoutUrl(cfSessionId);
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

  return {
    loading,
    session,
    error,
    paymentStatus,
    isCashfreeMode,
    isDummyMode,
    setPaymentStatus,
    setError,
  };
}
