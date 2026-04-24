import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CartItem, Cart } from '@/types/cart';

interface OrderSummaryProps {
  items: CartItem[];
  cartPricing: Cart['pricing'] | undefined;
  total: number;
  appliedCoupon: {
    couponId: string;
    code: string;
    discount: number;
    description: string;
  } | null;
  couponInput: string;
  couponLoading: boolean;
  couponError: string | null;
  onCouponInputChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  loading: boolean;
  isSubmitting: boolean;
  shippingProvider: string;
  shippingProviderLabel: string;
}

export function OrderSummary({
  items,
  cartPricing,
  total,
  appliedCoupon,
  couponInput,
  couponLoading,
  couponError,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  loading,
  isSubmitting,
  shippingProvider,
  shippingProviderLabel,
}: OrderSummaryProps) {
  const grandTotal = Math.max(0,
    total +
    (cartPricing?.shipping ?? 0) +
    (cartPricing?.tax ?? 0) -
    (appliedCoupon?.discount ?? 0)
  );

  const canSubmit = loading || isSubmitting || (shippingProvider === 'OTHER' && !shippingProviderLabel.trim());

  return (
    <div>
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="font-display text-xl">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex justify-between font-body">
              <span>
                {item.title} × {item.quantity}
              </span>
              <span>₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="border-t pt-4 space-y-2">
            {/* Coupon Input */}
            {!appliedCoupon ? (
              <div className="space-y-1.5 pb-2">
                <label className="font-body text-sm font-medium">Have a coupon?</label>
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => { onCouponInputChange(e.target.value.toUpperCase()); }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onApplyCoupon())}
                    placeholder="COUPON CODE"
                    className="font-mono text-sm uppercase"
                    maxLength={50}
                    disabled={couponLoading}
                    aria-label="Coupon code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="shrink-0"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </Button>
                </div>
                {couponError && (
                  <p className="font-body text-xs text-red-600">{couponError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <span className="font-mono text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                    {appliedCoupon.code}
                  </span>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{appliedCoupon.description}</p>
                </div>
                <button
                  type="button"
                  onClick={onRemoveCoupon}
                  className="font-body text-xs text-red-600 hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="flex justify-between font-body">
              <span>Subtotal</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-body text-muted-foreground">
              <span>Shipping</span>
              <span>
                {cartPricing?.shipping && cartPricing.shipping > 0
                  ? `₹${cartPricing.shipping.toLocaleString('en-IN')}`
                  : 'Free'}
              </span>
            </div>
            {cartPricing?.tax && cartPricing.tax > 0 ? (
              <div className="flex justify-between font-body text-muted-foreground">
                <span>Tax</span>
                <span>₹{cartPricing.tax.toLocaleString('en-IN')}</span>
              </div>
            ) : null}
            {appliedCoupon && (
              <div className="flex justify-between font-body text-green-700">
                <span>Discount</span>
                <span>−₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-xl border-t pt-2">
              <span>Total</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={canSubmit}
            aria-busy={isSubmitting}
          >
            {loading ? 'Placing Order...' : `Place Order — ₹${grandTotal.toLocaleString('en-IN')}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
