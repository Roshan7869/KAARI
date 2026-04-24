'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md mx-auto">
        <h2 className="font-display text-2xl md:text-3xl text-maroon-deep mb-3">Something went wrong</h2>
        <p className="font-body text-muted-foreground mb-6 px-4">
          {error.message || 'An unexpected error occurred. Our team has been notified.'}
        </p>
        <Button
          onClick={reset}
          variant="default"
          className="min-h-[44px] px-6"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
