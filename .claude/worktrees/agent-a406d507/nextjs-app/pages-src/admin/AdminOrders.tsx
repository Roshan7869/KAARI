import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tables } from '@/integrations/supabase/types';

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'
  | 'returned';

interface AdminOrder extends Tables<'orders'> {
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: <Package className="w-3 h-3" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-3 h-3" /> },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="w-3 h-3" /> },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700', icon: <Package className="w-3 h-3" /> },
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', { search, status, page }],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      return { orders: data as AdminOrder[], total: count || 0 };
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .then((res) => res.data || []);

      if (error) throw error;

      const statusCounts = (data || []).reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data?.length || 0,
        pending: statusCounts['pending'] || 0,
        processing: statusCounts['processing'] || 0,
        shipped: statusCounts['shipped'] || 0,
        delivered: statusCounts['delivered'] || 0,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Orders</h1>
          <p className="font-body text-muted-foreground mt-1">Manage customer orders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="font-body text-xs text-muted-foreground uppercase">Total</p>
            <p className="font-display text-2xl text-foreground">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-body text-xs text-muted-foreground uppercase">Pending</p>
            <p className="font-display text-2xl text-yellow-600">{stats?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-body text-xs text-muted-foreground uppercase">Processing</p>
            <p className="font-display text-2xl text-blue-600">{stats?.processing || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-body text-xs text-muted-foreground uppercase">Shipped</p>
            <p className="font-display text-2xl text-purple-600">{stats?.shipped || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-body text-xs text-muted-foreground uppercase">Delivered</p>
            <p className="font-display text-2xl text-green-600">{stats?.delivered || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-body text-muted-foreground">Loading orders...</p>
            </div>
          ) : data?.orders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-body text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.orders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border hover:bg-accent/5 transition-colors"
                  >
                    <TableCell className="font-body text-sm font-medium">
                      {order.order_number || `ORD-${order.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-body text-sm">{order.profiles?.full_name || 'Unknown'}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {order.profiles?.email || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-body text-sm font-semibold">
                      ₹{order.total_amount?.toLocaleString('en-IN') || 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                        className="font-body text-xs"
                      >
                        {order.payment_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`font-body text-xs ${statusConfig[order.status as OrderStatus]?.color || ''}`}
                      >
                        {statusConfig[order.status as OrderStatus]?.icon}
                        <span className="ml-1">{statusConfig[order.status as OrderStatus]?.label || order.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-body text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 font-body text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}