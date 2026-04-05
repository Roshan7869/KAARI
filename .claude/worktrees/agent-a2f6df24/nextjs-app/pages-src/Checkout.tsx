import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import kaariLogo from '@/assets/kaari-logo.webp';
import { trackEvent } from '@/lib/analytics';
import { generateDummyPaymentSession, generatePaymentPageUrl } from '@/lib/payment';
import { sanitizeTextInput, validateEmail, validatePhone } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export default function Checkout() {
  const { cart, loading, refreshCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // ALL hooks must be called before any early returns (React Rules of Hooks)
  const hasTrackedBeginCheckout = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    paymentMethod: 'cod',
  });
  const paymentMethods = [
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Credit / Debit Card' },
    { value: 'netbanking', label: 'Net Banking' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'cod', label: 'Cash on Delivery' },
  ];

  useEffect(() => {
    if (!cart || cart.items.length === 0 || loading || hasTrackedBeginCheckout.current) return;

    trackEvent('begin_checkout', {
      currency: 'INR',
      value: cart.pricing.total,
      items_count: cart.items.length,
    });
    hasTrackedBeginCheckout.current = true;
  }, [cart, loading]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validate inputs
    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      setSubmitting(true);
      const isCod = formData.paymentMethod === 'cod';

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to continue');
        return;
      }

      // Sanitize all text inputs before sending to server
      const sanitizedData = {
        p_cart_id: cart.cartId,
        p_payment_method: formData.paymentMethod,
        p_email: sanitizeTextInput(formData.email, 255),
        p_phone: sanitizeTextInput(formData.phone, 20),
        p_shipping_name: sanitizeTextInput(formData.name, 100),
        p_shipping_line1: sanitizeTextInput(formData.address1, 255),
        p_shipping_line2: sanitizeTextInput(formData.address2, 255),
        p_city: sanitizeTextInput(formData.city, 100),
        p_state: sanitizeTextInput(formData.state, 100),
        p_postal_code: formData.postalCode, // Already validated as numeric
        p_country: 'IN',
      };

      const { data: checkoutResult, error: checkoutError } = await supabase.rpc('create_order_from_cart', sanitizedData);

      if (checkoutError) throw checkoutError;
      if (!checkoutResult || typeof checkoutResult !== 'object') {
        throw new Error('Checkout failed. Please try again.');
      }

      const result = checkoutResult as {
        order_id: string;
        checkout_session_id: string;
        order_number?: string | null;
      };

      await refreshCart();

      if (isCod) {
        // COD: Order immediately confirmed
        trackEvent('purchase', {
          transaction_id: result.order_number || result.order_id,
          currency: 'INR',
          value: cart.pricing.total,
          payment_type: formData.paymentMethod,
          shipping: cart.pricing.shipping,
          tax: cart.pricing.tax,
        });

        toast.success('Order placed successfully!');
        navigate(`/order-confirmation/${result.order_id}?session=${result.checkout_session_id}`);
      } else {
        // Non-COD: Redirect to payment gateway
        trackEvent('add_payment_info', {
          currency: 'INR',
          value: cart.pricing.total,
          payment_type: formData.paymentMethod,
        });

        // Generate dummy payment session
        const paymentSession = generateDummyPaymentSession(
          result.order_id,
          cart.pricing.total,
          formData.paymentMethod
        );

        // Generate payment page URL with return URL
        const returnUrl = `/order-confirmation/${result.order_id}`;
        const paymentUrl = generatePaymentPageUrl(paymentSession.session_id, returnUrl);

        toast.success('Redirecting to payment gateway...');
        
        // Redirect to dummy payment page
        setTimeout(() => {
          window.location.href = paymentUrl;
        }, 1000);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-heritage text-xl text-muted-foreground mb-6">Your cart is empty</p>
          <Link
            to="/products"
            className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
          >
            Shop Now
          </Link>
        </div>
      </div>
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
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>

          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-8">Checkout</h1>

          <ErrorBoundary componentName="Checkout Form">
            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fabric-card p-6"
                  >
                    <h2 className="font-display text-2xl text-foreground mb-6">Contact Information</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                          Phone
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="fabric-card p-6"
                  >
                    <h2 className="font-display text-2xl text-foreground mb-6">Shipping Address</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.address1}
                          onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={formData.address2}
                          onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                            City
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                            State
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block font-body text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                            PIN Code
                          </label>
                          <input
                            type="text"
                            required
                            pattern="[0-9]{6}"
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="postal-code"
                            value={formData.postalCode}
                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                            className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-foreground focus:outline-none focus:border-primary"
                          />
                          <span className="text-xs text-muted-foreground mt-1 block">6-digit PIN code</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="fabric-card p-6"
                  >
                    <h2 className="font-display text-2xl text-foreground mb-6">Payment Method</h2>
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.value}
                          className="flex items-center gap-3 p-4 border border-border rounded-sm cursor-pointer hover:bg-accent/5 transition-colors"
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={method.value}
                            checked={formData.paymentMethod === method.value}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                            className="w-4 h-4"
                          />
                          <span className="font-body text-sm text-foreground">{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
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
                      <div className="border-t border-border pt-3 flex justify-between">
                        <span className="font-display text-lg text-foreground">Total</span>
                        <span className="font-display text-xl text-primary font-bold">
                          ₹{cart.pricing.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="yarn-button block w-full text-center py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase disabled:opacity-50"
                    >
                      {submitting
                        ? 'Processing...'
                        : formData.paymentMethod === 'cod'
                          ? 'Place COD Order'
                          : 'Proceed to Payment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}
