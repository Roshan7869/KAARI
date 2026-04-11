'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Search, Edit2, Phone, MapPin, ShoppingBag, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  orders: { count: number }[];
  total_spent: number;
}

interface CustomerEditForm {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<CustomerEditForm>({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', postal_code: '', country: 'India',
  });
  const queryClient = useQueryClient();

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerEditForm }) => {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Customer updated');
      setEditingCustomer(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleEdit = async (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({ full_name: customer.full_name || '', phone: customer.phone || '',
      address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: 'India' });
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`);
      if (res.ok) {
        const { address } = await res.json();
        if (address) setEditForm(prev => ({ ...prev,
          address_line1: address.address_line1 || '',
          address_line2: address.address_line2 || '',
          city: address.city || '', state: address.state || '',
          postal_code: address.postal_code || '', country: address.country || 'India' }));
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="font-display text-3xl text-foreground">Customers</h1>
        <p className="font-body text-muted-foreground mt-1">
          View and edit customer information
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
            <Badge variant="secondary" className="font-body text-xs">{customers.length} total</Badge>
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
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-sm shrink-0">
                      {(customer.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-body font-medium">{customer.full_name || 'Unnamed'}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>}
                        <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {customer.orders[0]?.count || 0} orders</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ₹{customer.total_spent.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(o) => !o && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Default Shipping Address
              </p>
              <div className="space-y-2">
                <Input placeholder="Address line 1" value={editForm.address_line1} onChange={(e) => setEditForm(p => ({ ...p, address_line1: e.target.value }))} />
                <Input placeholder="Address line 2 (optional)" value={editForm.address_line2} onChange={(e) => setEditForm(p => ({ ...p, address_line2: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="City" value={editForm.city} onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))} />
                  <Input placeholder="State" value={editForm.state} onChange={(e) => setEditForm(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Postal code" value={editForm.postal_code} onChange={(e) => setEditForm(p => ({ ...p, postal_code: e.target.value }))} />
                  <Input placeholder="Country" value={editForm.country} onChange={(e) => setEditForm(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
            <Button onClick={() => editingCustomer && updateMutation.mutate({ id: editingCustomer.id, data: editForm })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}