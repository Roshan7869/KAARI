/**
 * Payment Page - Cashfree UPI Payment Flow
 *
 * This page handles the Cashfree SDK integration for UPI payments.
 * Users can select their preferred UPI app and complete payment.
 *
 * For dummy sessions (when Cashfree is not configured), it simulates
 * the payment flow with a mock payment process.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Smartphone, CreditCard, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { trackEvent } from '@/lib/analytics';
import {
  loadCashfreeSDK,
  UPI_APPS,
  pollPaymentStatus,
  UPIApp
} from '@/lib/cashfree-sdk';
import kaariLogo from '@/assets/kaari-logo.webp';

type PaymentState = 'loading' | 'select-method' | 'processing' | 'success' | 'failed' | 'timeout';

interface OrderDetails {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
}

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Get parameters from URL
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const returnUrl = searchParams.get('return_url');

  // State
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [selectedApp, setSelectedApp] = useState<UPIApp | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing payment...');
  const [attemptCount, setAttemptCount] = useState(0);

  // Fetch order details and verify session
  useEffect(() => {
    const initializePayment = async () => {
      if (!sessionId || !orderId) {
        setPaymentState('failed');
        setStatusMessage('Invalid payment session. Please try again.');
        return;
      }

      // Check if this is a dummy payment session - redirect to DummyPayment page
      if (sessionId.startsWith('dummy_pay_') || sessionId.startsWith('dummy_')) {
        console.log('Dummy payment session detected, redirecting to DummyPayment page');
        const params = new URLSearchParams({
          session_id: sessionId,
        });
        if (returnUrl) {
          params.append('return_url', returnUrl);
        }
        navigate(`/dummy-payment?${params.toString()}`, { replace: true });
        return;
      }

      try {
        // Fetch order details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, status, payment_status, user_id')
          .eq('id', orderId)
          .maybeSingle();

        if (orderError) throw orderError;

        if (!orderData) {
          setPaymentState('failed');
          setStatusMessage('Order not found.');
          return;
        }

        // Verify order belongs to user
        if (orderData.user_id !== user?.id) {
          setPaymentState('failed');
          setStatusMessage('Unauthorized access to order.');
          return;
        }

        setOrder(orderData);

        // Check if payment already completed
        if (orderData.payment_status === 'completed') {
          setPaymentState('success');
          setStatusMessage('Payment already completed!');
          return;
        }

        // Check if payment already failed
        if (orderData.payment_status === 'failed') {
          setPaymentState('failed');
          setStatusMessage('Previous payment failed. Please try again.');
          return;
        }

        // Load Cashfree SDK for real payment sessions
        await loadCashfreeSDK();
        setPaymentState('select-method');
      } catch (error) {
        console.error('Payment initialization error:', error);
        setPaymentState('failed');
        setStatusMessage('Failed to initialize payment. Please try again.');
      }
    };

    if (!authLoading && user) {
      initializePayment();
    }
  }, [sessionId, orderId, user, authLoading, returnUrl, navigate]);

  // Handle UPI app selection and payment
  const handleUPIPayment = useCallback(async (app: UPIApp) => {
    if (!sessionId || !orderId || !order) return;

    setSelectedApp(app);
    setPaymentState('processing');
    setStatusMessage(`Opening ${app.name}...`);

    try {
      trackEvent('begin_payment', {
        payment_method: 'upi',
        upi_app: app.id,
        order_id: orderId,
        value: order.total_amount,
        currency: 'INR',
      });

      // For Cashfree SDK, we open the payment flow
      // The SDK will handle the UPI app redirection
      const cashfree = (window as any).CashfreeSDK?.init({
        paymentSessionId: sessionId,
        mode: 'sandbox', // Will be set from config
      });

      if (!cashfree) {
        throw new Error('Cashfree SDK not loaded');
      }

      // Open Drop component for UPI
      await cashfree.drop({
        components: ['upi'],
        onSuccess: async (data: any) => {
          console.log('Payment successful:', data);
          setPaymentState('success');
          setStatusMessage('Payment successful!');

          // Poll for payment confirmation
          const status = await pollPaymentStatus(orderId, 10, 2000);

          if (status === 'completed') {
            trackEvent('purchase', {
              transaction_id: data.payment_id || orderId,
              currency: 'INR',
              value: order.total_amount,
              payment_type: 'upi',
            });

            setTimeout(() => {
              const redirectUrl = returnUrl || `/order-confirmation/${orderId}`;
              navigate(redirectUrl);
            }, 1500);
          }
        },
        onFailure: (data: any) => {
          console.error('Payment failed:', data);
          setPaymentState('failed');
          setStatusMessage(data.message || 'Payment failed. Please try again.');

          trackEvent('payment_failed', {
            order_id: orderId,
            error: data.message,
          });
        },
        onClose: () => {
          // User closed the payment modal
          if (paymentState === 'processing') {
            setPaymentState('select-method');
            setSelectedApp(null);
          }
        },
      });
    } catch (error) {
      console.error('UPI payment error:', error);
      setPaymentState('failed');
      setStatusMessage('Failed to initiate payment. Please try again.');
    }
  }, [sessionId, orderId, order, paymentState, returnUrl, navigate]);

  // Handle manual payment status polling (for timeout/retry)
  const handleRetryPayment = useCallback(() => {
    setPaymentState('select-method');
    setSelectedApp(null);
    setAttemptCount(prev => prev + 1);
  }, []);

  // Handle payment timeout - check status manually
  const handleCheckStatus = useCallback(async () => {
    if (!orderId) return;

    setPaymentState('processing');
    setStatusMessage('Checking payment status...');

    try {
      const status = await pollPaymentStatus(orderId, 5, 2000);

      if (status === 'completed') {
        setPaymentState('success');
        setStatusMessage('Payment confirmed!');
        setTimeout(() => {
          navigate(returnUrl || `/order-confirmation/${orderId}`);
        }, 1500);
      } else if (status === 'failed') {
        setPaymentState('failed');
        setStatusMessage('Payment failed. Please try again.');
      } else {
        setPaymentState('timeout');
        setStatusMessage('Payment status unclear. Please check your UPI app for confirmation.');
      }
    } catch (error) {
      console.error('Status check error:', error);
      setPaymentState('failed');
      setStatusMessage('Failed to check payment status.');
    }
  }, [orderId, returnUrl, navigate]);

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
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl text-foreground mb-4">Authentication Required</h1>
          <Link to="/login" className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground">
            Sign In
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
          <Link
            to={returnUrl || '/'}
            className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel Payment
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {/* Loading State */}
            {paymentState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <p className="font-body text-muted-foreground">{statusMessage}</p>
              </motion.div>
            )}

            {/* UPI App Selection */}
            {paymentState === 'select-method' && order && (
              <motion.div
                key="select-method"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fabric-card p-6 md:p-8"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-3xl text-foreground mb-2">UPI Payment</h1>
                  <p className="font-body text-muted-foreground">Select your UPI app to complete payment</p>
                </div>

                {/* Order Summary */}
                <div className="bg-accent/5 rounded-sm p-4 mb-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-body text-sm text-muted-foreground">Order</p>
                      <p className="font-display text-lg text-foreground">{order.order_number || order.id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-sm text-muted-foreground">Amount</p>
                      <p className="font-display text-2xl text-primary">₹{order.total_amount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* UPI App Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {UPI_APPS.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleUPIPayment(app)}
                      className="fabric-card p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors"
                    >
                      <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-primary" />
                      </div>
                      <span className="font-body text-sm text-foreground">{app.name}</span>
                    </button>
                  ))}
                </div>

                {/* Pay with UPI ID option */}
                <div className="border-t border-border pt-6">
                  <button
                    onClick={() => handleUPIPayment({ id: 'upi', name: 'UPI ID', icon: '', deepLinkPrefix: 'upi://' })}
                    className="w-full fabric-card p-4 flex items-center justify-between hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-body text-sm text-foreground">Pay with UPI ID</p>
                        <p className="font-body text-xs text-muted-foreground">Enter your UPI ID manually</p>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                  </button>
                </div>

                {attemptCount > 0 && (
                  <p className="font-body text-xs text-muted-foreground text-center mt-4">
                    Attempt {attemptCount + 1} • Previous payment was not completed
                  </p>
                )}
              </motion.div>
            )}

            {/* Processing State */}
            {paymentState === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fabric-card p-6 md:p-8 text-center"
              >
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <h2 className="font-display text-2xl text-foreground mb-2">Processing Payment</h2>
                <p className="font-body text-muted-foreground mb-6">{statusMessage}</p>
                <p className="font-body text-sm text-muted-foreground">
                  {selectedApp ? `Waiting for ${selectedApp.name} confirmation...` : 'Please wait...'}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-4">
                  Do not close this page. Your payment is being processed.
                </p>
              </motion.div>
            )}

            {/* Success State */}
            {paymentState === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fabric-card p-6 md:p-8 text-center"
              >
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
                <h2 className="font-display text-2xl text-foreground mb-2">Payment Successful!</h2>
                <p className="font-body text-muted-foreground mb-6">{statusMessage}</p>
                <div className="bg-green-50 border border-green-200 rounded-sm p-4 mb-6">
                  <p className="font-body text-sm text-green-800">
                    Your order has been confirmed and will be processed shortly.
                  </p>
                </div>
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                <p className="font-body text-sm text-muted-foreground mt-2">Redirecting...</p>
              </motion.div>
            )}

            {/* Failed State */}
            {paymentState === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fabric-card p-6 md:p-8 text-center"
              >
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
                <h2 className="font-display text-2xl text-foreground mb-2">Payment Failed</h2>
                <p className="font-body text-muted-foreground mb-6">{statusMessage}</p>
                <div className="bg-destructive/5 border border-destructive/20 rounded-sm p-4 mb-6">
                  <p className="font-body text-sm text-destructive">
                    Your payment could not be processed. Please try again.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleRetryPayment}
                    className="yarn-button w-full px-6 py-3 bg-primary text-primary-foreground"
                  >
                    Try Again
                  </button>
                  <Link
                    to="/cart"
                    className="font-body text-sm text-muted-foreground hover:text-foreground text-center"
                  >
                    Return to Cart
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Timeout State */}
            {paymentState === 'timeout' && (
              <motion.div
                key="timeout"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fabric-card p-6 md:p-8 text-center"
              >
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="font-display text-2xl text-foreground mb-2">Payment Timeout</h2>
                <p className="font-body text-muted-foreground mb-6">{statusMessage}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleCheckStatus}
                    className="yarn-button w-full px-6 py-3 bg-primary text-primary-foreground"
                  >
                    Check Payment Status
                  </button>
                  <button
                    onClick={handleRetryPayment}
                    className="font-body text-sm text-muted-foreground hover:text-foreground text-center"
                  >
                    Try Again
                  </button>
                  <Link
                    to="/cart"
                    className="font-body text-xs text-muted-foreground hover:text-foreground text-center"
                  >
                    Return to Cart
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}