import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Search,
  Users,
  Mail,
  Phone,
  ShoppingBag,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Tables } from '@/integrations/supabase/types';

interface CustomerWithStats extends Tables<'profiles'> {
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
}

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', { search, page }],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          orders (
            id,
            total_amount,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }

      // Transform to include stats
      const customers: CustomerWithStats[] = (data || []).map((profile) => {
        const orders = profile.orders || [];
        const totalSpent = orders.reduce((sum: number, o: { total_amount: number | null }) => sum + (o.total_amount || 0), 0);
        const lastOrder = orders.reduce(
          (latest: { created_at: string } | null, o: { created_at: string }) =>
            !latest || o.created_at > latest.created_at ? o : latest,
          null,
        );

        return {
          ...profile,
          order_count: orders.length,
          total_spent: totalSpent,
          last_order_date: lastOrder?.created_at || null,
        };
      });

      return { customers, total: count || 0 };
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const { data: customerOrders } = useQuery({
    queryKey: ['customer-orders', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            quantity,
            unit_price,
            line_total,
            products (title)
          )
        `)
        .eq('user_id', selectedCustomer.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching customer orders:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!selectedCustomer,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Customers</h1>
          <p className="font-body text-muted-foreground mt-1">View and manage customer accounts</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-body text-muted-foreground">Loading customers...</p>
            </div>
          ) : data?.customers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-body text-muted-foreground">No customers found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data?.customers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-display text-primary text-lg">
                          {customer.full_name?.[0]?.toUpperCase() || customer.email?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-body font-medium text-foreground">
                          {customer.full_name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="font-body text-sm">{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span className="font-body text-sm">{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-body text-sm font-semibold">
                            ₹{customer.total_spent.toLocaleString('en-IN')}
                          </p>
                          <p className="font-body text-xs text-muted-foreground">
                            {customer.order_count} order{customer.order_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View customer information and order history
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-display text-primary text-2xl">
                    {selectedCustomer.full_name?.[0]?.toUpperCase() || selectedCustomer.email?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-display text-xl text-foreground">
                    {selectedCustomer.full_name || 'Unknown'}
                  </p>
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="font-body text-sm">{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span className="font-body text-sm">{selectedCustomer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="font-body text-sm">
                        Joined {new Date(selectedCustomer.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-body text-xs text-muted-foreground uppercase">Orders</p>
                        <p className="font-display text-xl text-foreground">{selectedCustomer.order_count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <span className="font-display text-green-600">₹</span>
                      </div>
                      <div>
                        <p className="font-body text-xs text-muted-foreground uppercase">Total Spent</p>
                        <p className="font-display text-xl text-foreground">
                          ₹{selectedCustomer.total_spent.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerOrders && customerOrders.length > 0 ? (
                    <div className="space-y-3">
                      {customerOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-3 bg-accent/5 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-body text-sm font-medium">
                              {order.order_number || `ORD-${order.id.slice(0, 8)}`}
                            </p>
                            <Badge
                              variant={order.status === 'delivered' ? 'default' : 'secondary'}
                              className="font-body text-xs"
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="font-body text-sm font-semibold">
                              ₹{order.total_amount?.toLocaleString('en-IN') || 0}
                            </p>
                          </div>
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="font-body text-xs text-muted-foreground">
                                {order.order_items.map((item: { products: { title: string } | null; quantity: number }) =>
                                  `${item.products?.title || 'Unknown'} (${item.quantity})`
                                ).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-body text-sm text-muted-foreground text-center py-4">
                      No orders yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}