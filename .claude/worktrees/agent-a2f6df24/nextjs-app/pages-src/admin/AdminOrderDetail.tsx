import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'
  | 'returned';

interface OrderItem extends Tables<'order_items'> {
  products: {
    title: string;
    slug: string;
  } | null;
  variants: {
    sku: string | null;
    size: string | null;
    color: string | null;
  } | null;
}

interface OrderDetail extends Tables<'orders'> {
  profiles: {
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
  order_items: OrderItem[];
  order_status_events: (Tables<'order_status_events'> & {
    actor: {
      full_name: string | null;
    } | null;
  })[];
  payments: Tables<'payments'>[];
  checkout_sessions: Tables<'checkout_sessions'> | null;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: <Package className="w-4 h-4" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-4 h-4" /> },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-4 h-4" /> },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700', icon: <Package className="w-4 h-4" /> },
};

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'cancelled', 'on_hold'],
  processing: ['shipped', 'cancelled', 'on_hold'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  on_hold: ['pending', 'processing', 'cancelled'],
  returned: [],
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async (): Promise<OrderDetail | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (full_name, email, phone),
          order_items (
            *,
            products (title, slug),
            variants (sku, size, color)
          ),
          order_status_events (
            *,
            actor:profiles!order_status_events_actor_user_id_fkey (full_name)
          ),
          payments (*),
          checkout_sessions (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });

  const updateOrderStatus = async () => {
    if (!order || !newStatus) return;

    setUpdating(true);
    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Create status event
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: eventError } = await supabase.from('order_status_events').insert({
        order_id: order.id,
        old_status: order.status,
        new_status: newStatus,
        note: note || null,
        actor_user_id: user?.id,
      });

      if (eventError) console.error('Error creating status event:', eventError);

      // Refetch order
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });

      setNewStatus(null);
      setNote('');
      toast.success('Order status updated');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="font-body text-muted-foreground">Order not found</p>
        <Button variant="link" onClick={() => navigate('/admin/orders')}>
          Back to orders
        </Button>
      </div>
    );
  }

  const currentStatus = order.status as OrderStatus;
  const availableTransitions = statusTransitions[currentStatus] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-foreground">
            Order {order.order_number || `ORD-${order.id.slice(0, 8)}`}
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Created {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <Badge className={`${statusConfig[currentStatus]?.color} text-base px-4 py-2`}>
          {statusConfig[currentStatus]?.icon}
          <span className="ml-2">{statusConfig[currentStatus]?.label}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-accent/5 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-body font-medium">{item.products?.title || 'Unknown Product'}</p>
                      {item.variants && (
                        <p className="font-body text-sm text-muted-foreground">
                          {[item.variants.size, item.variants.color].filter(Boolean).join(' / ')}
                        </p>
                      )}
                      <p className="font-body text-sm text-muted-foreground">
                        Qty: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className="font-body font-semibold">
                      ₹{item.line_total.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border mt-4 pt-4 space-y-2">
                <div className="flex justify-between font-body text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{order.subtotal?.toLocaleString('en-IN') || 0}</span>
                </div>
                {order.shipping_amount && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>₹{order.shipping_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {order.tax_amount && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>₹{order.tax_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-body font-semibold text-lg">
                  <span>Total</span>
                  <span>₹{order.total_amount?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_status_events
                  ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((event) => (
                    <div key={event.id} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        {statusConfig[event.new_status as OrderStatus]?.icon || <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-body font-medium">
                            {statusConfig[event.new_status as OrderStatus]?.label || event.new_status}
                          </p>
                          <span className="font-body text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {event.note && (
                          <p className="font-body text-sm text-muted-foreground">{event.note}</p>
                        )}
                        {event.actor?.full_name && (
                          <p className="font-body text-xs text-muted-foreground">
                            by {event.actor.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableTransitions.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <Select
                      value={newStatus || ''}
                      onValueChange={(v) => setNewStatus(v as OrderStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTransitions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusConfig[status]?.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note about this status change..."
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={updateOrderStatus}
                    disabled={!newStatus || updating}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Status
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="font-body text-sm text-muted-foreground">
                  No status transitions available for this order.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-display text-primary text-lg">
                    {order.profiles?.full_name?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-body font-medium">{order.profiles?.full_name || 'Unknown'}</p>
                  <p className="font-body text-sm text-muted-foreground">{order.profiles?.email}</p>
                </div>
              </div>
              {order.profiles?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="font-body text-sm">{order.profiles.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.checkout_sessions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-body">{order.checkout_sessions.shipping_name}</p>
                    <p className="font-body text-sm text-muted-foreground">
                      {order.checkout_sessions.shipping_line1}
                      {order.checkout_sessions.shipping_line2 && (
                        <>, {order.checkout_sessions.shipping_line2}</>
                      )}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      {order.checkout_sessions.city}, {order.checkout_sessions.state}{' '}
                      {order.checkout_sessions.postal_code}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      {order.checkout_sessions.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          {order.payments && order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment</CardTitle>
              </CardHeader>
              <CardContent>
                {order.payments.map((payment) => (
                  <div key={payment.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="font-body text-sm">{payment.provider}</span>
                      </div>
                      <Badge
                        variant={payment.status === 'paid' ? 'default' : 'secondary'}
                        className="font-body text-xs"
                      >
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span>
                        {payment.currency} {payment.amount.toLocaleString()}
                      </span>
                    </div>
                    {payment.provider_payment_id && (
                      <p className="font-body text-xs text-muted-foreground">
                        ID: {payment.provider_payment_id}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}