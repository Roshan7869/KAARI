'use client';

import { useCallback, useState } from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { toast } from 'sonner';
import { processSecurePayment } from '@/lib/payment';
import {
  UPIApp,
  getPaymentStatusWithBackoff,
  loadCashfreeSDK,
  redirectUPIApp,
} from '@/lib/cashfree-sdk';
import { PaymentSession, PaymentStatus } from './types';

export function usePaymentProcessing({
  session,
  sessionId,
  isDummyMode,
  paymentStatus,
  setPaymentStatus,
  setError,
  router,
}: {
  session: PaymentSession | null;
  sessionId: string | null;
  isDummyMode: boolean;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (status: PaymentStatus) => void;
  setError: (message: string | null) => void;
  router: AppRouterInstance;
}) {
  const [processingStep, setProcessingStep] = useState(0);

  const simulateProcessing = useCallback(async () => {
    if (process.env.NODE_ENV === 'production' && !isDummyMode) {
      return;
    }

    const steps = [
      'Initializing secure connection...',
      'Verifying payment details...',
      'Connecting to UPI gateway...',
      'Processing transaction...',
    ];

    for (let i = 0; i < steps.length; i += 1) {
      setProcessingStep(i);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }, [isDummyMode]);

  const handleUPIAppSelect = useCallback(async (app: UPIApp) => {
    if (!session || paymentStatus === 'processing') return;

    setPaymentStatus('loading-sdk');
    setError(null);

    try {
      await loadCashfreeSDK();
      toast.info(`Opening ${app.name}...`);
      await redirectUPIApp(app, session.sessionId, session.amount);
      setPaymentStatus('polling');

      const pollResult = await getPaymentStatusWithBackoff(session.orderId, () => {});

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
    } catch (upiError) {
      const msg = upiError instanceof Error ? upiError.message : 'UPI payment failed';
      setPaymentStatus('failed');
      setError(msg);
    }
  }, [session, paymentStatus, setPaymentStatus, setError, router]);

  const handleDummyPayment = useCallback(async () => {
    if (!sessionId || paymentStatus === 'processing') return;

    setPaymentStatus('processing');
    setError(null);

    try {
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

        await new Promise((resolve) => setTimeout(resolve, 1500));

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
  }, [
    sessionId,
    paymentStatus,
    isDummyMode,
    simulateProcessing,
    setPaymentStatus,
    setError,
    session,
    router,
  ]);

  return {
    processingStep,
    handleUPIAppSelect,
    handleDummyPayment,
  };
}
