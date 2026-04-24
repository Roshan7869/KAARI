export interface StartOnlinePaymentInput {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

function resolveAppUrl(): string {
  let appUrl = window.location.origin;
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!envAppUrl) return appUrl;

  if (process.env.NODE_ENV === 'production') {
    const isLocalEnv = envAppUrl.includes('localhost') || envAppUrl.includes('127.0.0.1');
    return isLocalEnv ? appUrl : envAppUrl;
  }
  return envAppUrl;
}

export async function startOnlinePaymentFlow(input: StartOnlinePaymentInput): Promise<string> {
  const appUrl = resolveAppUrl();
  const paymentResponse = await fetch('/api/payments/cashfree/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: input.orderId,
      amount: Number(input.amount.toFixed(2)),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      returnUrl: `${appUrl}/payment`,
      notifyUrl: `${appUrl}/api/webhooks/payment`,
    }),
  });

  const paymentData = await paymentResponse.json() as {
    success?: boolean;
    error?: string;
    redirectUrl?: string;
  };

  if (!paymentResponse.ok || !paymentData.success || !paymentData.redirectUrl) {
    throw new Error(paymentData.error || 'Failed to start payment flow');
  }

  return paymentData.redirectUrl;
}
