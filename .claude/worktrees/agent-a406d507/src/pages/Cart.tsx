import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Plus, Minus, LogIn } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import kaariLogo from '@/assets/kaari-logo.webp';

export default function Cart() {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const { user, loading: authLoading } = useAuth();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={kaariLogo} alt="Kaari" className="w-8 h-8 object-contain" />
              <span className="font-display text-xl text-foreground">कारी</span>
            </Link>
          </div>
        </nav>
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="font-body text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: { pathname: '/cart' } }} replace />;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={kaariLogo} alt="Kaari" className="w-8 h-8 object-contain" />
              <span className="font-display text-xl text-foreground">कारी</span>
            </Link>
          </div>
        </nav>
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="font-body text-muted-foreground">Loading your cart...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={kaariLogo} alt="Kaari" className="w-8 h-8 object-contain" />
            <span className="font-display text-xl text-foreground">कारी</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/products" className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>

          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-8">Your Cart</h1>

          <ErrorBoundary componentName="Cart Items">
            {!cart || cart.items.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-heritage text-xl text-muted-foreground mb-6">Your cart is empty</p>
                <Link
                  to="/products"
                  className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
                >
                  Shop Now
                </Link>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cart.items.map((item, index) => (
                    <motion.div
                      key={item.cartItemId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="fabric-card p-6"
                    >
                      <div className="flex gap-6">
                        <div className="flex-1">
                          <h3 className="font-display text-xl text-foreground mb-2">{item.title}</h3>
                          {item.itemType === 'customized' && item.customization && (
                            <div className="mb-3 p-3 bg-accent/10 rounded-sm">
                              <p className="font-body text-xs text-accent uppercase tracking-wider mb-2">Customized</p>
                              <p className="font-heritage text-sm text-foreground/80 italic">
                                "{item.customization.message}"
                              </p>
                              {item.customization.uploads.length > 0 && (
                                <p className="font-body text-xs text-muted-foreground mt-2">
                                  {item.customization.uploads.length} reference image(s) uploaded
                                </p>
                              )}
                            </div>
                          )}
                          <p className="font-display text-lg text-primary mb-4">
                            ₹{item.unitPrice.toLocaleString('en-IN')}
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                              className="p-2 border border-border hover:bg-accent/10 transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-body text-sm min-w-[2rem] text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                              className="p-2 border border-border hover:bg-accent/10 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <p className="font-display text-xl text-foreground font-semibold">
                            ₹{item.lineTotal.toLocaleString('en-IN')}
                          </p>
                          <button
                            onClick={() => removeItem(item.cartItemId)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="lg:col-span-1">
                  <div className="fabric-card p-6 sticky top-24">
                    <h2 className="font-display text-2xl text-foreground mb-6">Order Summary</h2>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between font-body text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">₹{cart.pricing.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-body text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="text-foreground">₹{cart.pricing.shipping.toLocaleString('en-IN')}</span>
                      </div>
                      {cart.pricing.tax > 0 && (
                        <div className="flex justify-between font-body text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="text-foreground">₹{cart.pricing.tax.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-3 flex justify-between">
                        <span className="font-display text-lg text-foreground">Total</span>
                        <span className="font-display text-xl text-primary font-bold">
                          ₹{cart.pricing.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/checkout"
                      className="yarn-button block w-full text-center py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
                    >
                      Proceed to Checkout
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}
