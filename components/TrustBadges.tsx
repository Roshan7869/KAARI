'use client';

import { Shield, Truck, RotateCcw } from 'lucide-react';

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center gap-4 py-4 border-t border-border mt-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-green-600" />
        <span className="text-xs text-muted-foreground">Secure Payment</span>
      </div>
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-green-600" />
        <span className="text-xs text-muted-foreground">Free Shipping ₹500+</span>
      </div>
      <div className="flex items-center gap-2">
        <RotateCcw className="w-5 h-5 text-green-600" />
        <span className="text-xs text-muted-foreground">Easy Returns</span>
      </div>
      {/* Placeholder for payment provider badges */}
      <div className="flex items-center gap-2">
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-6" />
        <span className="text-xs text-muted-foreground">Cashfree</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-6" />
        <span className="text-xs text-muted-foreground">UPI</span>
      </div>
    </div>
  );
}