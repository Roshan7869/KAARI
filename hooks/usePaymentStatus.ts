'use client';

import { logger } from '@/lib/logger-client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

type PaymentStatusValue = 'pending' | 'completed' | 'failed' | 'expired' | 'unknown';

interface UsePaymentStatusOptions {
  orderId: string;
  enabled?: boolean;
  intervalMs?: number;
  maxAttempts?: number;
  onComplete?: (status: PaymentStatusValue) => void;
}

interface UsePaymentStatusReturn {
  status: PaymentStatusValue;
  isPolling: boolean;
  error: string | null;
  transactionId: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook to poll payment status from the database.
 * Uses exponential backoff to reduce server load.
 * Fires once and stops — never repeats after terminal status.
 */
export function usePaymentStatus({
  orderId,
  enabled = true,
  intervalMs = 2000,
  maxAttempts = 30,
  onComplete,
}: UsePaymentStatusOptions): UsePaymentStatusReturn {
  const [status, setStatus] = useState<PaymentStatusValue>('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const stopPolling = useCallback(() => {
    activeRef.current = false;
    setIsPolling(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!activeRef.current || !orderId) return;

    attemptRef.current += 1;

    if (attemptRef.current > maxAttempts) {
      setStatus('expired');
      setError('Payment check timed out. Please refresh or contact support.');
      stopPolling();
      onComplete?.('expired');
      return;
    }

    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('status, provider_payment_id')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        logger.error('Payment status poll error:', fetchError);
      }

      if (payment?.status === 'completed') {
        setStatus('completed');
        setTransactionId(payment.provider_payment_id || null);
        stopPolling();
        onComplete?.('completed');
        return;
      }

      if (payment?.status === 'failed') {
        setStatus('failed');
        setTransactionId(payment.provider_payment_id || null);
        stopPolling();
        onComplete?.('failed');
        return;
      }

      // Still pending — schedule next poll with backoff
      if (activeRef.current) {
        const backoffDelay = Math.min(intervalMs * Math.pow(1.3, attemptRef.current - 1), 10000);
        timerRef.current = setTimeout(poll, backoffDelay);
      }
    } catch {
      // Network error — keep trying
      if (activeRef.current) {
        timerRef.current = setTimeout(poll, intervalMs * 2);
      }
    }
  }, [orderId, maxAttempts, intervalMs, stopPolling, onComplete]);

  const startPolling = useCallback(() => {
    attemptRef.current = 0;
    activeRef.current = true;
    setIsPolling(true);
    setError(null);
    poll();
  }, [poll]);

  // Auto-start if enabled
  useEffect(() => {
    if (enabled && orderId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, orderId, startPolling, stopPolling]);

  return {
    status,
    isPolling,
    error,
    transactionId,
    startPolling,
    stopPolling,
  };
}
