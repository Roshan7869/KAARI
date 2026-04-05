'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
          <div className="max-w-md w-full text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Critical Error
            </h1>
            <p className="text-gray-600 mb-6">
              A critical error occurred that prevented the page from loading properly.
            </p>
            <div className="space-y-4">
              <Button
                onClick={reset}
                className="w-full gap-2"
              >
                <RefreshCw size={20} />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
