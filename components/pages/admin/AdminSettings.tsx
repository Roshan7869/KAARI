'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ShippingConfig = {
  threshold: number;
  enabled: boolean;
  base_cost: number;
};

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');

  // ── Shipping Config ──────────────────────────────────────────────
  const { data: shippingConfig } = useQuery<ShippingConfig>({
    queryKey: ['admin-shipping-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      return (json.data?.free_shipping as ShippingConfig) ?? { threshold: 999, enabled: true, base_cost: 79 };
    },
  });

  const [shipping, setShipping] = useState<ShippingConfig>({
    threshold: shippingConfig?.threshold ?? 999,
    enabled: shippingConfig?.enabled ?? true,
    base_cost: shippingConfig?.base_cost ?? 79,
  });

  // Sync query result to local state when loaded
  const resolvedShipping: ShippingConfig = shippingConfig
    ? { ...shippingConfig, ...shipping }
    : shipping;

  const saveShipping = useMutation({
    mutationFn: async (config: ShippingConfig) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'free_shipping', value: config }),
      });
      if (!res.ok) throw new Error('Failed to save');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-config'] });
    },
  });

  // ── Profile Update ────────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Settings</h1>
        <p className="font-body text-muted-foreground mt-1">
          Manage store settings and your account
        </p>
      </div>

      {/* Shipping Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Shipping Configuration</CardTitle>
          <CardDescription className="font-body text-sm">
            Set the free shipping threshold. Changes apply instantly across the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-body text-sm font-medium">Enable Free Shipping</Label>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                Offer free shipping when order exceeds the threshold
              </p>
            </div>
            <Switch
              checked={resolvedShipping.enabled}
              onCheckedChange={(enabled) =>
                setShipping((prev) => ({ ...prev, enabled }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-body text-sm font-medium">Free Shipping Threshold (₹)</Label>
              <Input
                type="number"
                min={0}
                value={resolvedShipping.threshold}
                onChange={(e) =>
                  setShipping((prev) => ({ ...prev, threshold: Number(e.target.value) }))
                }
                disabled={!resolvedShipping.enabled}
                className="mt-1"
                placeholder="999"
              />
              <p className="font-body text-xs text-muted-foreground mt-1">
                Orders above this amount get free shipping
              </p>
            </div>

            <div>
              <Label className="font-body text-sm font-medium">Base Shipping Cost (₹)</Label>
              <Input
                type="number"
                min={0}
                value={resolvedShipping.base_cost}
                onChange={(e) =>
                  setShipping((prev) => ({ ...prev, base_cost: Number(e.target.value) }))
                }
                className="mt-1"
                placeholder="79"
              />
              <p className="font-body text-xs text-muted-foreground mt-1">
                Charged when order is below threshold
              </p>
            </div>
          </div>

          <Button
            onClick={() => saveShipping.mutate(resolvedShipping)}
            disabled={saveShipping.isPending}
          >
            {saveShipping.isPending ? 'Saving...' : 'Save Shipping Config'}
          </Button>

          {saveShipping.isSuccess && (
            <p className="font-body text-sm text-green-600">Shipping config updated.</p>
          )}
          {saveShipping.isError && (
            <p className="font-body text-sm text-red-600">Failed to save. Try again.</p>
          )}
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-body text-sm font-medium">Email</label>
            <Input
              value={user?.email || ''}
              disabled
              className="mt-1"
            />
            <p className="font-body text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="font-body text-sm font-medium">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
            />
          </div>

          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>

          {updateProfile.isSuccess && (
            <p className="font-body text-sm text-green-600">
              Profile updated successfully
            </p>
          )}
          {updateProfile.isError && (
            <p className="font-body text-sm text-red-600">
              Failed to update profile
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground mb-4">
            These actions are irreversible. Please proceed with caution.
          </p>
          <Button variant="destructive" disabled>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}