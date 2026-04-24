export type PaymentStatus = 'idle' | 'loading-sdk' | 'processing' | 'polling' | 'success' | 'failed' | 'error';

export interface PaymentSession {
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  expiresAt: string;
}
