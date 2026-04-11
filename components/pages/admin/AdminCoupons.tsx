'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Tag } from 'lucide-react';

type Coupon = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

const empty = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  usage_limit: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    code: string;
    type: 'percentage' | 'fixed';
    value: string;
    min_order_amount: string;
    max_discount_amount: string;
    usage_limit: string;
    valid_from: string;
    valid_until: string;
  }>(empty);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await fetch('/api/admin/coupons');
      const json = await res.json() as { data: Coupon[] };
      return json.data ?? [];
    },
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          min_order_amount: Number(form.min_order_amount) || 0,
          max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : undefined,
          valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        }),
      });
      const json = await res.json() as { data?: Coupon; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to create coupon');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setForm(empty);
      setShowForm(false);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error('Failed to update');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const handleCreate = () => {
    setFormError(null);
    if (!form.code.trim()) { setFormError('Code is required'); return; }
    if (!form.value || Number(form.value) <= 0) { setFormError('Value must be positive'); return; }
    if (form.type === 'percentage' && Number(form.value) > 100) { setFormError('Percentage cannot exceed 100'); return; }
    createCoupon.mutate();
  };

  const formatValue = (c: Coupon) =>
    c.type === 'percentage'
      ? `${c.value}%${c.max_discount_amount ? ` (max ₹${c.max_discount_amount})` : ''}`
      : `₹${c.value}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Coupons</h1>
          <p className="font-body text-muted-foreground mt-1">Manage discount codes for customers</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Coupon
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Create Coupon</CardTitle>
            <CardDescription className="font-body text-sm">
              Leave optional fields blank for no limit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-body text-sm">Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER20"
                  className="mt-1 font-mono uppercase"
                  maxLength={50}
                />
              </div>
              <div>
                <Label className="font-body text-sm">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as 'percentage' | 'fixed' }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-body text-sm">
                  {form.type === 'percentage' ? 'Discount %' : 'Discount ₹'} *
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={form.type === 'percentage' ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder={form.type === 'percentage' ? '20' : '100'}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-body text-sm">Min Order Amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_order_amount}
                  onChange={(e) => setForm((p) => ({ ...p, min_order_amount: e.target.value }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              {form.type === 'percentage' && (
                <div>
                  <Label className="font-body text-sm">Max Discount Cap (₹, optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.max_discount_amount}
                    onChange={(e) => setForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                    placeholder="500"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label className="font-body text-sm">Usage Limit (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usage_limit}
                  onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-body text-sm">Valid From</Label>
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((p) => ({ ...p, valid_from: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-body text-sm">Valid Until (optional)</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {formError && <p className="font-body text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createCoupon.isPending}>
                {createCoupon.isPending ? 'Creating...' : 'Create Coupon'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setFormError(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupon Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            All Coupons
            <span className="ml-2 font-body text-sm text-muted-foreground font-normal">
              ({coupons.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="font-body text-sm text-muted-foreground">Loading...</p>
          ) : coupons.length === 0 ? (
            <div className="text-center py-10">
              <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-body text-muted-foreground">No coupons yet. Create one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Code</th>
                    <th className="pb-2 pr-4">Discount</th>
                    <th className="pb-2 pr-4">Min Order</th>
                    <th className="pb-2 pr-4">Usage</th>
                    <th className="pb-2 pr-4">Expires</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {coupons.map((c) => (
                    <tr key={c.id} className="py-3">
                      <td className="py-3 pr-4">
                        <span className="font-mono font-semibold">{c.code}</span>
                      </td>
                      <td className="py-3 pr-4">{formatValue(c)}</td>
                      <td className="py-3 pr-4">
                        {c.min_order_amount > 0 ? `₹${c.min_order_amount}` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {c.usage_count}
                        {c.usage_limit !== null ? ` / ${c.usage_limit}` : ''}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {c.valid_until
                          ? new Date(c.valid_until).toLocaleDateString('en-IN')
                          : 'No expiry'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.is_active}
                            onCheckedChange={(val) => toggleActive.mutate({ id: c.id, is_active: val })}
                            aria-label={`Toggle ${c.code}`}
                          />
                          <Badge variant={c.is_active ? 'default' : 'secondary'}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => {
                            if (confirm(`Delete coupon ${c.code}?`)) {
                              deleteCoupon.mutate(c.id);
                            }
                          }}
                          aria-label={`Delete ${c.code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
