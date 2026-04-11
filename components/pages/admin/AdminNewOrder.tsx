'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  product_variants: Array<{ id: string; sku: string; size: string | null; color: string | null; price: number; stock_qty: number }>;
}

interface OrderItem {
  product_id: string;
  product_title: string;
  variant_id: string | null;
  variant_label: string;
  quantity: number;
  unit_price: number;
}

export default function AdminNewOrder() {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [shippingAmount, setShippingAmount] = useState(99);
  const [address, setAddress] = useState({
    shipping_name: '',
    shipping_line1: '',
    shipping_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: 'IN',
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customer-search', customerSearch],
    queryFn: async () => {
      if (!customerSearch) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`)
        .limit(10);
      return (data || []) as unknown as Customer[];
    },
    enabled: customerSearch.length >= 2,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['product-search', productSearch],
    queryFn: async () => {
      if (!productSearch) return [];
      const { data } = await supabase
        .from('products')
        .select('id, title, slug, base_price, product_variants (id, sku, size, color, price, stock_qty)')
        .ilike('title', `%${productSearch}%`)
        .eq('is_active', true)
        .limit(10);
      return (data as unknown as Product[]) || [];
    },
    enabled: productSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Order ${data.order_number} created successfully`);
      router.push('/admin/orders');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function addItem(product: Product, variant: Product['product_variants'][number] | null) {
    const existing = orderItems.find(
      i => i.product_id === product.id && i.variant_id === (variant?.id || null)
    );
    if (existing) {
      setOrderItems(items => items.map(i =>
        i.product_id === product.id && i.variant_id === (variant?.id || null)
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setOrderItems(items => [...items, {
        product_id: product.id,
        product_title: product.title,
        variant_id: variant?.id || null,
        variant_label: variant ? `${variant.size || ''} ${variant.color || ''}`.trim() || variant.sku : 'Base',
        quantity: 1,
        unit_price: variant?.price ?? product.base_price,
      }]);
    }
    setProductSearch('');
  }

  function removeItem(idx: number) {
    setOrderItems(items => items.filter((_, i) => i !== idx));
  }

  function updateItemQty(idx: number, qty: number) {
    setOrderItems(items => items.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, qty) } : item));
  }

  function updateItemPrice(idx: number, price: number) {
    setOrderItems(items => items.map((item, i) => i === idx ? { ...item, unit_price: Math.max(0, price) } : item));
  }

  const subtotal = orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = subtotal + shippingAmount;

  function handleSubmit() {
    if (!selectedCustomer) return toast.error('Please select a customer');
    if (orderItems.length === 0) return toast.error('Add at least one product');
    if (!address.shipping_name || !address.shipping_line1 || !address.shipping_city) {
      return toast.error('Fill in required shipping fields');
    }

    createMutation.mutate({
      user_id: selectedCustomer.id,
      items: orderItems.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      ...address,
      shipping_amount: shippingAmount,
      payment_status: paymentStatus,
      status,
      notes,
    });
  }

  return (
    <div className="space-y-6 mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-display text-3xl text-foreground">Create Order</h1>
          <p className="font-body text-muted-foreground mt-1">Manually create an order for a customer</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{selectedCustomer.full_name || 'Unnamed'}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                  {customers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {customers.map(c => (
                        <button
                          key={c.id}
                          className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                        >
                          <span className="font-medium">{c.full_name || 'Unnamed'}</span>
                          <span className="text-muted-foreground ml-2">{c.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products to add..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-9"
                />
                {products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {products.map(p => (
                      <div key={p.id} className="border-b last:border-0">
                        {p.product_variants.length > 0 ? (
                          p.product_variants.map(v => (
                            <button
                              key={v.id}
                              className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex justify-between items-center"
                              onClick={() => addItem(p, v)}
                            >
                              <span>
                                <span className="font-medium">{p.title}</span>
                                {(v.size || v.color) && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    {[v.size, v.color].filter(Boolean).join(' / ')}
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground">₹{v.price} · {v.stock_qty} in stock</span>
                            </button>
                          ))
                        ) : (
                          <button
                            className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex justify-between items-center"
                            onClick={() => addItem(p, null)}
                          >
                            <span className="font-medium">{p.title}</span>
                            <span className="text-muted-foreground">₹{p.base_price}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Search for products above to add them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product_title}</p>
                        {item.variant_label !== 'Base' && (
                          <Badge variant="secondary" className="text-xs mt-0.5">{item.variant_label}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number" min={1}
                          value={item.quantity}
                          onChange={e => updateItemQty(idx, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-sm"
                        />
                        <Label className="text-xs text-muted-foreground">₹</Label>
                        <Input
                          type="number" min={0}
                          value={item.unit_price}
                          onChange={e => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 h-8 text-sm"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader><CardTitle className="text-base">Shipping Address</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input value={address.shipping_name} onChange={e => setAddress(a => ({ ...a, shipping_name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Address Line 1 *</Label>
                <Input value={address.shipping_line1} onChange={e => setAddress(a => ({ ...a, shipping_line1: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Address Line 2</Label>
                <Input value={address.shipping_line2} onChange={e => setAddress(a => ({ ...a, shipping_line2: e.target.value }))} />
              </div>
              <div>
                <Label>City *</Label>
                <Input value={address.shipping_city} onChange={e => setAddress(a => ({ ...a, shipping_city: e.target.value }))} />
              </div>
              <div>
                <Label>State *</Label>
                <Input value={address.shipping_state} onChange={e => setAddress(a => ({ ...a, shipping_state: e.target.value }))} />
              </div>
              <div>
                <Label>Postal Code *</Label>
                <Input value={address.shipping_postal_code} onChange={e => setAddress(a => ({ ...a, shipping_postal_code: e.target.value }))} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={address.shipping_country} onChange={e => setAddress(a => ({ ...a, shipping_country: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shipping (₹)</span>
                  <Input
                    type="number" min={0}
                    value={shippingAmount}
                    onChange={e => setShippingAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 h-7 text-sm"
                  />
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label>Order Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Internal note (not shown to customer)"
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
