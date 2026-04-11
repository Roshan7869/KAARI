'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PaymentLoadingProps {
  step?: number;
  totalSteps?: number;
  message?: string;
  amount?: number;
}

const DEFAULT_STEPS = [
  'Initializing secure connection...',
  'Verifying payment details...',
  'Connecting to UPI gateway...',
  'Processing transaction...',
  'Finalizing...',
];

export default function PaymentLoading({
  step = 0,
  totalSteps = 4,
  message,
  amount,
}: PaymentLoadingProps) {
  const displayMessage = message || DEFAULT_STEPS[step] || 'Processing...';
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-primary/30 bg-primary/5">
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
              <div
                className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"
              />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
            </div>

            {/* Amount */}
            {amount && (
              <p className="font-display text-2xl font-bold text-primary">
                ₹{amount.toLocaleString('en-IN')}
              </p>
            )}

            {/* Status */}
            <div className="text-center">
              <p className="font-display text-lg mb-1">Processing Payment</p>
              <p className="font-body text-sm text-muted-foreground animate-pulse">
                {displayMessage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="font-body text-xs text-muted-foreground text-center mt-2">
                Step {step + 1} of {totalSteps}
              </p>
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              <span className="font-body">Secured by Cashfree</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
