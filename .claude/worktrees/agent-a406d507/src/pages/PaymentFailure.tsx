/**
 * Payment Failure Page
 *
 * Displayed when a payment fails or is cancelled.
 * Provides options to retry payment or return to cart.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ShoppingCart, Home, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import kaariLogo from '@/assets/kaari-logo.webp';
import { trackEvent } from '@/lib/analytics';

interface OrderInfo {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
}

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get('order_id');
  const errorCode = searchParams.get('error_code');
  const errorMessage = searchParams.get('error_message');

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, created_at, user_id')
          .eq('id', orderId)
          .maybeSingle();

        if (error) throw error;

        // Verify order belongs to user
        if (data && data.user_id !== user?.id) {
          setOrder(null);
        } else {
          setOrder(data);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchOrderDetails();
    }
  }, [orderId, user, authLoading]);

  // Track payment failure event
  useEffect(() => {
    if (errorCode || errorMessage) {
      trackEvent('payment_failed', {
        order_id: orderId || 'unknown',
        error_code: errorCode || 'unknown',
        error_message: errorMessage || 'unknown',
      });
    }
  }, [errorCode, errorMessage, orderId]);

  const handleRetryPayment = () => {
    if (order) {
      navigate(`/payment?order_id=${order.id}`);
    } else {
      navigate('/cart');
    }
  };

  // Redirect to login if not authenticated
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl text-foreground mb-4">Authentication Required</h1>
          <Link to="/login" className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="PaymentFailure">
      <main className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={kaariLogo} alt="Kaari" className="w-8 h-8 object-contain" />
              <span className="font-display text-xl text-foreground">कारी</span>
            </Link>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-6">
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fabric-card p-6 md:p-8"
            >
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl text-foreground text-center mb-2">
                Payment Failed
              </h1>
              <p className="font-body text-muted-foreground text-center mb-6">
                We couldn't complete your payment. Don't worry, your cart items are still saved.
              </p>

              {/* Error Details */}
              {(errorCode || errorMessage) && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-sm p-4 mb-6">
                  <p className="font-body text-sm text-destructive">
                    <strong>Error:</strong> {errorMessage || errorCode}
                  </p>
                </div>
              )}

              {/* Order Info */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : order ? (
                <div className="bg-accent/5 rounded-sm p-4 mb-6">
                  <h3 className="font-display text-lg text-foreground mb-3">Order Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-body text-sm text-muted-foreground">Order Number</span>
                      <span className="font-body text-sm text-foreground">
                        {order.order_number || order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-sm text-muted-foreground">Amount</span>
                      <span className="font-display text-lg text-primary">
                        ₹{order.total_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-sm text-muted-foreground">Date</span>
                      <span className="font-body text-sm text-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Common Reasons */}
              <div className="bg-muted/50 rounded-sm p-4 mb-6">
                <h3 className="font-display text-sm text-foreground mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Common Reasons for Payment Failure
                </h3>
                <ul className="font-body text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Insufficient balance in your account</li>
                  <li>Incorrect UPI PIN or card details</li>
                  <li>Network connectivity issues</li>
                  <li>Payment session expired</li>
                  <li>Bank server temporarily unavailable</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleRetryPayment}
                  className="yarn-button w-full px-6 py-3 bg-primary text-primary-foreground flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Payment Again
                </button>

                <Link
                  to="/cart"
                  className="block w-full text-center px-6 py-3 border border-border hover:bg-accent/5 transition-colors rounded-sm font-body text-sm"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Return to Cart
                  </span>
                </Link>

                <Link
                  to="/"
                  className="block w-full text-center px-6 py-3 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Home className="w-4 h-4" />
                    Continue Shopping
                  </span>
                </Link>
              </div>

              {/* Support */}
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="font-body text-sm text-muted-foreground">
                  Need help?{' '}
                  <a
                    href="mailto:support@kaari.com"
                    className="text-primary hover:underline"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}