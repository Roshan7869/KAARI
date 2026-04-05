import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package, MapPin, CreditCard, Truck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ErrorBoundary from '@/components/ErrorBoundary';
import { motion } from 'framer-motion';
import kaariLogo from '@/assets/kaari-logo.webp';

interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customization_snapshot: Record<string, unknown> | null;
  product?: {
    name: string;
    slug: string;
  };
  variant?: {
    sku: string;
    attributes: Record<string, unknown>;
  };
  image?: {
    url: string;
    alt_text: string | null;
  };
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
}

interface PaymentInfo {
  id: string;
  provider: string;
  amount: number;
  status: string;
  provider_payment_id: string | null;
  created_at: string;
}

interface OrderDetails {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number;
  subtotal: number | null;
  shipping_amount: number | null;
  tax_amount: number | null;
  created_at: string;
  items: OrderItem[];
  shipping_address: ShippingAddress | null;
  payment: PaymentInfo | null;
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const isNewOrder = searchParams.get('new') === 'true';

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-confirmation', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<OrderDetails | null> => {
      if (!orderId) return null;

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          subtotal,
          shipping_amount,
          tax_amount,
          created_at,
          checkout_session_id
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError || !orderData) return null;

      // Fetch order items with product details
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          variant_id,
          product_name,
          quantity,
          unit_price,
          total_price,
          customization_snapshot
        `)
        .eq('order_id', orderId);

      // Fetch product images for items
      const itemsWithImages: OrderItem[] = await Promise.all(
        (itemsData || []).map(async (item) => {
          // Get product media
          const { data: mediaData } = await supabase
            .from('product_media')
            .select('url, alt_text')
            .eq('product_id', item.product_id)
            .eq('media_type', 'image')
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle();

          // Get product slug
          const { data: productData } = await supabase
            .from('products')
            .select('name, slug')
            .eq('id', item.product_id)
            .maybeSingle();

          return {
            ...item,
            product: productData || undefined,
            image: mediaData || undefined,
          };
        })
      );

      // Fetch shipping address from checkout session
      let shippingAddress: ShippingAddress | null = null;
      if (orderData.checkout_session_id) {
        const { data: checkoutData } = await supabase
          .from('checkout_sessions')
          .select(`
            shipping_name,
            shipping_line1,
            shipping_line2,
            city,
            state,
            postal_code,
            country,
            phone
          `)
          .eq('id', orderData.checkout_session_id)
          .maybeSingle();

        if (checkoutData) {
          shippingAddress = {
            name: checkoutData.shipping_name || '',
            line1: checkoutData.shipping_line1 || '',
            line2: checkoutData.shipping_line2,
            city: checkoutData.city || '',
            state: checkoutData.state || '',
            postal_code: checkoutData.postal_code || '',
            country: checkoutData.country || 'IN',
            phone: checkoutData.phone,
          };
        }
      }

      // Fetch payment info
      const { data: paymentData } = await supabase
        .from('payments')
        .select('id, provider, amount, status, provider_payment_id, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...orderData,
        items: itemsWithImages,
        shipping_address: shippingAddress,
        payment: paymentData,
      };
    },
  });

  // Calculate estimated delivery (7-10 business days from now)
  const getEstimatedDelivery = () => {
    const now = new Date();
    const minDays = 7;
    const maxDays = 10;
    const minDate = new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

    return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
  };

  // Get payment method display name
  const getPaymentMethodName = (provider: string): string => {
    const methods: Record<string, string> = {
      cod: 'Cash on Delivery',
      upi: 'UPI Payment',
      card: 'Card Payment',
      netbanking: 'Net Banking',
      wallet: 'Wallet Payment',
      cashfree: 'Cashfree',
    };
    return methods[provider] || provider;
  };

  // Get status display
  const getStatusDisplay = (status: string): { text: string; color: string } => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
      paid: { text: 'Paid', color: 'text-blue-600 bg-blue-50' },
      processing: { text: 'Processing', color: 'text-purple-600 bg-purple-50' },
      shipped: { text: 'Shipped', color: 'text-indigo-600 bg-indigo-50' },
      delivered: { text: 'Delivered', color: 'text-green-600 bg-green-50' },
      cancelled: { text: 'Cancelled', color: 'text-red-600 bg-red-50' },
    };
    return statusMap[status] || { text: status, color: 'text-gray-600 bg-gray-50' };
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={kaariLogo} alt="Kaari" className="w-8 h-8 object-contain" />
            <span className="font-display text-xl text-foreground">कारी</span>
          </Link>
          <Link
            to="/products"
            className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <ErrorBoundary componentName="Order Confirmation">
            {/* Success Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="font-display text-4xl text-foreground mb-3">
                {isNewOrder ? 'Order Placed!' : 'Order Confirmed'}
              </h1>
              <p className="font-body text-muted-foreground max-w-md mx-auto">
                {isNewOrder
                  ? 'Your order has been successfully placed. You will receive a confirmation email shortly.'
                  : 'Thank you for your order. We have received your request and are processing it.'}
              </p>
            </motion.div>

            {isLoading ? (
              <div className="fabric-card p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-body text-muted-foreground">Loading order details...</p>
              </div>
            ) : order ? (
              <div className="space-y-6">
                {/* Order Number & Status */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="fabric-card p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-body text-sm text-muted-foreground mb-1">Order Number</p>
                      <p className="font-display text-2xl text-foreground">
                        {order.order_number || order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        Placed on{' '}
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-body ${getStatusDisplay(order.status).color}`}
                      >
                        <Package className="w-4 h-4 mr-1.5" />
                        {getStatusDisplay(order.status).text}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-body ${
                          order.payment_status === 'completed'
                            ? 'text-green-600 bg-green-50'
                            : 'text-yellow-600 bg-yellow-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        {order.payment_status === 'completed' ? 'Payment Complete' : 'Payment Pending'}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Estimated Delivery */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="fabric-card p-6 bg-primary/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-body text-sm text-muted-foreground">Estimated Delivery</p>
                      <p className="font-display text-lg text-foreground">{getEstimatedDelivery()}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        Delivery updates will be sent to your email
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Order Items */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="fabric-card p-6"
                >
                  <h2 className="font-display text-xl text-foreground mb-4">Order Items</h2>
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                      >
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-secondary/50 rounded-sm overflow-hidden flex-shrink-0">
                          {item.image?.url ? (
                            <img
                              src={item.image.url}
                              alt={item.image.alt_text || item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${item.product?.slug || ''}`}
                            className="font-body font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                          >
                            {item.product_name}
                          </Link>
                          {item.customization_snapshot && (
                            <p className="font-body text-xs text-muted-foreground mt-1">
                              Customized
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="font-body text-sm text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                            <p className="font-body text-sm font-medium text-foreground">
                              ₹{item.total_price.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="mt-6 pt-6 border-t border-border space-y-2">
                    {order.subtotal && (
                      <div className="flex justify-between font-body text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">₹{order.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {order.shipping_amount !== null && order.shipping_amount !== undefined && (
                      <div className="flex justify-between font-body text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="text-foreground">
                          {order.shipping_amount === 0 ? 'Free' : `₹${order.shipping_amount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    )}
                    {order.tax_amount !== null && order.tax_amount !== undefined && order.tax_amount > 0 && (
                      <div className="flex justify-between font-body text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="text-foreground">₹{order.tax_amount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-body text-base font-medium pt-2 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">₹{order.total_amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Two Column Layout for Shipping & Payment */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Shipping Address */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="fabric-card p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h2 className="font-display text-lg text-foreground">Shipping Address</h2>
                    </div>
                    {order.shipping_address ? (
                      <address className="font-body text-sm text-foreground not-italic">
                        <p className="font-medium">{order.shipping_address.name}</p>
                        <p>{order.shipping_address.line1}</p>
                        {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                        <p>
                          {order.shipping_address.city}, {order.shipping_address.state}{' '}
                          {order.shipping_address.postal_code}
                        </p>
                        <p>{order.shipping_address.country}</p>
                        {order.shipping_address.phone && (
                          <p className="mt-2">Phone: {order.shipping_address.phone}</p>
                        )}
                      </address>
                    ) : (
                      <p className="font-body text-sm text-muted-foreground">
                        Shipping address not available
                      </p>
                    )}
                  </motion.div>

                  {/* Payment Information */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="fabric-card p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <h2 className="font-display text-lg text-foreground">Payment Information</h2>
                    </div>
                    {order.payment ? (
                      <div className="space-y-2 font-body text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="text-foreground">
                            {getPaymentMethodName(order.payment.provider)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="text-foreground">
                            ₹{order.payment.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span
                            className={
                              order.payment.status === 'completed'
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }
                          >
                            {order.payment.status.charAt(0).toUpperCase() + order.payment.status.slice(1)}
                          </span>
                        </div>
                        {order.payment.provider_payment_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="text-foreground font-mono text-xs">
                              {order.payment.provider_payment_id}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 font-body text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="text-foreground">Cash on Delivery</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="text-yellow-600">Payment on delivery</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Need Help Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="fabric-card p-6 bg-secondary/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-foreground mb-1">Need Help?</h3>
                      <p className="font-body text-sm text-muted-foreground">
                        If you have any questions about your order, please{' '}
                        <Link to="/contact" className="text-primary hover:underline">
                          contact our support team
                        </Link>
                        . We're here to help!
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fabric-card p-8 text-center"
              >
                <p className="font-body text-muted-foreground mb-6">
                  Your order has been submitted. We could not load detailed metadata right now.
                </p>
                <Link
                  to="/products"
                  className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
                >
                  Continue Shopping
                </Link>
              </motion.div>
            )}

            {/* Action Buttons */}
            {order && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
              >
                <Link
                  to="/products"
                  className="yarn-button inline-block px-8 py-3 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase"
                >
                  Continue Shopping
                </Link>
                <Link
                  to="/"
                  className="inline-block px-8 py-3 border border-border font-body text-sm tracking-[0.15em] uppercase text-foreground hover:bg-accent/10 transition-colors"
                >
                  Go Home
                </Link>
              </motion.div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}