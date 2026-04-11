'use client';

import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartSkeleton } from '@/components/ui/skeleton-loader';

export default function Cart() {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const router = useRouter();
  const items = cart?.items ?? [];
  const pricing = cart?.pricing ?? { subtotal: 0, shipping: 0, tax: 0, total: 0 };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <h1 className="font-display text-3xl md:text-4xl text-foreground mb-10">Shopping Cart</h1>
        <CartSkeleton itemCount={3} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md mx-auto text-center glass-card-cream rounded-xl p-10">
          <h2 className="font-display text-3xl text-foreground mb-4">Your Cart is Empty</h2>
          <p className="font-body text-muted-foreground mb-8">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link href="/products">
            <Button size="lg" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(cartItemId, newQuantity);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
      <h1 className="font-display text-3xl md:text-4xl text-foreground mb-10">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.cartItemId} className="glass-card-cream rounded-xl p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <h3 className="font-display text-lg text-foreground">{item.title}</h3>
                  <p className="font-body text-sm text-muted-foreground capitalize mt-0.5">
                    {item.itemType === 'customized' ? 'Customized' : 'Standard'}
                  </p>
                  {item.customization && (
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      Quote Status: {item.customization.quoteStatus}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 border border-border rounded-sm" role="group" aria-label={`Quantity control for ${item.title}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity for ${item.title}. Current quantity: ${item.quantity}`}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-body font-medium text-foreground" aria-live="polite" aria-atomic="true">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)}
                      aria-label={`Increase quantity for ${item.title}. Current quantity: ${item.quantity}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Price */}
                  <div className="text-right min-w-[100px]">
                    <p className="font-display text-lg text-primary font-semibold">
                      ₹{(item.lineTotal).toLocaleString('en-IN')}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      ₹{item.unitPrice.toLocaleString('en-IN')} each
                    </p>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.cartItemId)}
                    aria-label={`Remove ${item.title} from cart`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <div className="glass-card-cream rounded-xl p-6 sticky top-24" aria-label="Order summary and checkout" role="region" aria-live="polite">
            <h2 className="font-display text-xl text-foreground mb-6">Order Summary</h2>
            <div className="space-y-3 font-body text-sm">
              <div className="flex justify-between" aria-label={`Subtotal: ₹${pricing.subtotal.toLocaleString('en-IN')}`}>
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between" aria-label={`Shipping: ${pricing.shipping > 0 ? `₹${pricing.shipping.toLocaleString('en-IN')}` : 'Free'}`}>
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">{pricing.shipping > 0 ? `₹${pricing.shipping.toLocaleString('en-IN')}` : 'Free'}</span>
              </div>
              {pricing.tax > 0 && (
                <div className="flex justify-between" aria-label={`Tax: ₹${pricing.tax.toLocaleString('en-IN')}`}>
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">₹{pricing.tax.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border/60 mt-4 pt-4">
              <div className="flex justify-between font-display text-xl text-foreground" aria-label={`Total cost: ₹${pricing.total.toLocaleString('en-IN')}`}>
                <span>Total</span>
                <span className="text-primary font-bold">₹{pricing.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              size="lg"
              onClick={() => router.push('/checkout')}
              aria-label={`Proceed to checkout with ${items.length} item(s) totaling ₹${pricing.total.toLocaleString('en-IN')}`}
            >
              Proceed to Checkout
            </Button>

            <Link href="/products" className="block mt-3">
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
