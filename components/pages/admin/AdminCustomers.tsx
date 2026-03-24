'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  orders: { count: number }[];
  total_spent: number;
}

export default function AdminCustomers() {
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get order counts for each customer
      const customersWithOrders = await Promise.all(
        (data || []).map(async (profile) => {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('status', 'completed')
            .in('order_id',
              (await supabase.from('orders').select('id').eq('user_id', profile.id)).data?.map(o => o.id) || []
            );

          return {
            ...profile,
            orders: [{ count: count || 0 }],
            total_spent: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
          };
        })
      );

      return customersWithOrders;
    },
    staleTime: 1000 * 60,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Customers</h1>
        <p className="font-body text-muted-foreground mt-1">
          View customer information
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
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
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-sm"
                >
                  <div>
                    <p className="font-body font-medium">
                      {customer.full_name || 'Unnamed'}
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      {customer.phone || 'No phone'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-body text-sm">
                      {customer.orders[0]?.count || 0} orders
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      ₹{customer.total_spent.toLocaleString('en-IN')} spent
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}