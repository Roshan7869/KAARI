'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Search, Plus, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

export default function AdminOrders() {
  const [search, setSearch] = useState('');

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders', search],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`order_number.ilike.%${search}%,profiles.full_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Orders</h1>
          <p className="font-body text-muted-foreground mt-1">View and manage customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('/api/admin/export?type=orders', '_blank')}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link href="/admin/orders/new"><Plus className="w-4 h-4" /> New Order</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block p-4 bg-muted/50 rounded-sm hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-body font-medium">
                        #{order.order_number || order.id.slice(0, 8)}
                      </p>
                      <p className="font-body text-sm text-muted-foreground">
                        {order.profiles?.full_name || 'Guest'} •{' '}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <p className="font-body font-medium">
                        ₹{(order.total_amount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
