'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Package,
  Truck,
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAdminOrder, useOrderStatusHistory, useUpdateOrderStatus, type OrderStatus } from '@/hooks/useAdminOrders';
import { logOrderStatusChange } from '@/lib/auditLog';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPaymentStatusColor(status: string) {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
    case 'refunded':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function StatusTimeline({ events }: { events: ReturnType<typeof useOrderStatusHistory>['data'] }) {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status history available</p>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {index === events.length - 1 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(event.status)}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            {event.note && (
              <p className="text-sm text-muted-foreground mt-1">{event.note}</p>
            )}
            {event.actor && (
              <p className="text-xs text-muted-foreground mt-1">
                by {event.actor.full_name || 'Unknown'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading, error } = useAdminOrder(orderId);
  const { data: statusHistory } = useOrderStatusHistory(orderId);
  const updateStatusMutation = useUpdateOrderStatus();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!order || newStatus === order.status) return;
    setSelectedStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!order || !selectedStatus) return;

    await updateStatusMutation.mutateAsync({
      orderId: order.id,
      newStatus: selectedStatus,
      previousStatus: order.status,
    });

    // Log to audit
    await logOrderStatusChange(order.id, order.status, selectedStatus);

    setShowConfirmDialog(false);
    setSelectedStatus(null);
  };

  if (isLoading) {
    return <OrderSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading order</AlertTitle>
          <AlertDescription>
            There was a problem loading the order details. Please try again later.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/admin/orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Order not found</AlertTitle>
          <AlertDescription>
            The order you are looking for does not exist or has been deleted.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/admin/orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const orderNumber = order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
  const customerName = order.customer?.full_name || 'Unknown Customer';
  const customerEmail = order.checkoutSession?.email || 'N/A';
  const customerPhone = order.checkoutSession?.phone || order.customer?.phone || 'N/A';
  const shippingName = order.checkoutSession?.shipping_name || customerName;
  const shippingAddress = order.checkoutSession?.shipping_line1 || 'N/A';
  const shippingCity = order.checkoutSession?.city || 'N/A';
  const shippingState = order.checkoutSession?.state || 'N/A';
  const shippingPincode = order.checkoutSession?.postal_code || 'N/A';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/admin/orders')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl">Order {orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={order.status}
            onValueChange={(value) => handleStatusChange(value as OrderStatus)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.value === order.status}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <Badge className={getStatusColor(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <Badge className={getPaymentStatusColor(order.payment_status || 'pending')}>
                  {(order.payment_status || 'pending').charAt(0).toUpperCase() +
                    (order.payment_status || 'pending').slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Shipping</p>
                <span className="font-medium">
                  {order.checkoutSession?.shipping_method || 'Standard Delivery'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {item.product?.title || 'Unknown Product'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} x Rs.{item.unit_price.toLocaleString('en-IN')}
                  </p>
                </div>
                <span className="font-medium">
                  Rs.{item.line_total.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-display font-bold">
                <span>Total</span>
                <span>Rs.{(order.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Shipping Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{customerName}</p>
              <p className="text-sm text-muted-foreground">{customerEmail}</p>
              <p className="text-sm text-muted-foreground">{customerPhone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{shippingName}</p>
              <p className="text-sm text-muted-foreground">{shippingAddress}</p>
              <p className="text-sm text-muted-foreground">
                {shippingCity}, {shippingState} - {shippingPincode}
              </p>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline events={statusHistory} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.print()}>
          Print Invoice
        </Button>
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the order status from{' '}
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>{' '}
              to{' '}
              <Badge className={getStatusColor(selectedStatus || 'pending')}>
                {selectedStatus}
              </Badge>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}