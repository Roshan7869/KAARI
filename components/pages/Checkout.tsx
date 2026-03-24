'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { sanitizeTextInput, validatePhone } from '@/lib/sanitization';
import { createPaymentSession } from '@/lib/payment';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';

const checkoutSchema = z.object({
  full_name: z.string().min(2, 'Full name is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  phone: z.string().min(10, 'Phone number is required').max(20).refine(validatePhone, 'Invalid phone number'),
  address_line1: z.string().min(5, 'Address line 1 is required').max(200).transform((value) => sanitizeTextInput(value, 200)),
  address_line2: z.string().max(100).transform((value) => sanitizeTextInput(value, 100)).optional(),
  city: z.string().min(2, 'City is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  state: z.string().min(2, 'State is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  postal_code: z.string().min(6, 'Postal code is required').max(10).regex(/^\d+$/, 'Invalid postal code'),
});

interface SavedAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export default function Checkout() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const items = cart?.items ?? [];
  const total = cart?.pricing.total ?? 0;
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [formError, setFormError] = useState<string | null>(null);
  const [csrfToken] = useState(() => generateCsrfToken());
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);

  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return;
      setAddressesLoading(true);
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedAddresses((data || []) as SavedAddress[]);
        if (data?.length) {
          const preferred = (data as SavedAddress[]).find((address) => address.is_default) || data[0];
          setSelectedAddressId(preferred.id);
          setFormData((prev) => ({
            ...prev,
            full_name: preferred.full_name || prev.full_name,
            phone: preferred.phone || prev.phone,
            address_line1: preferred.address_line1 || prev.address_line1,
            address_line2: preferred.address_line2 || '',
            city: preferred.city || prev.city,
            state: preferred.state || prev.state,
            postal_code: preferred.postal_code || prev.postal_code,
          }));
        }
      } catch (addressError) {
        console.error('Address load error:', addressError);
      } finally {
        setAddressesLoading(false);
      }
    };

    loadAddresses();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = savedAddresses.find((item) => item.id === addressId);
    if (!address) return;
    setFormData({
      full_name: address.full_name || '',
      phone: address.phone || '',
      address_line1: address.address_line1 || '',
      address_line2: address.address_line2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
    });
    setSaveAddress(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    const form = e.currentTarget as HTMLFormElement;
    const submittedCsrfToken = new FormData(form).get('csrf_token') as string | null;
    if (!validateCsrfToken(submittedCsrfToken, csrfToken)) {
      setFormError('Session validation failed. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const validatedForm = checkoutSchema.parse(formData);

      if (saveAddress && user) {
        let targetAddressId = selectedAddressId || '';

        if (targetAddressId) {
          const { error: updateAddressError } = await supabase
            .from('addresses')
            .update({
              full_name: validatedForm.full_name,
              phone: validatedForm.phone,
              address_line1: validatedForm.address_line1,
              address_line2: validatedForm.address_line2 || null,
              city: validatedForm.city,
              state: validatedForm.state,
              postal_code: validatedForm.postal_code,
              country: 'IN',
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetAddressId)
            .eq('user_id', user.id);

          if (updateAddressError) throw updateAddressError;
        } else {
          const { data: insertedAddress, error: insertAddressError } = await supabase
            .from('addresses')
            .insert({
              user_id: user.id,
              label: 'Home',
              full_name: validatedForm.full_name,
              phone: validatedForm.phone,
              address_line1: validatedForm.address_line1,
              address_line2: validatedForm.address_line2 || null,
              city: validatedForm.city,
              state: validatedForm.state,
              postal_code: validatedForm.postal_code,
              country: 'IN',
              is_default: savedAddresses.length === 0,
            })
            .select('id')
            .single();

          if (insertAddressError) throw insertAddressError;
          targetAddressId = insertedAddress?.id || '';
          if (targetAddressId) setSelectedAddressId(targetAddressId);
        }

        if (targetAddressId) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);

          await supabase
            .from('addresses')
            .update({ is_default: true, updated_at: new Date().toISOString() })
            .eq('id', targetAddressId)
            .eq('user_id', user.id);
        }
      }

      // Get user's cart
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!cart) throw new Error('Cart not found');

      // Create order using RPC
      const { data: orderData, error } = await supabase.rpc('create_order_from_cart', {
        p_cart_id: cart.id,
        p_payment_method: paymentMethod,
        p_phone: validatedForm.phone,
        p_shipping_name: validatedForm.full_name,
        p_shipping_line1: validatedForm.address_line1,
        p_shipping_line2: validatedForm.address_line2 || null,
        p_city: validatedForm.city,
        p_state: validatedForm.state,
        p_postal_code: validatedForm.postal_code,
        p_country: 'IN',
      });

      if (error) throw error;
      const orderId = (orderData as { order_id?: string } | null)?.order_id;
      if (!orderId) {
        throw new Error('Order could not be created');
      }

      // Clear cart locally
      await clearCart();

      // Redirect to order confirmation or payment
      if (paymentMethod === 'cod') {
        router.push(`/order-confirmation/${orderId}`);
      } else {
        const { sessionId } = await createPaymentSession(orderId);
        router.push(`/dummy-payment?session_id=${sessionId}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      if (error instanceof z.ZodError) {
        setFormError(error.issues[0]?.message || 'Please check your input values.');
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Failed to place order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>
      {formError ? (
        <p className="mb-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700">
          {formError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Saved Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="font-body text-sm font-medium">Choose saved address</label>
              <select
                className="w-full border border-input bg-background px-3 py-2 rounded-sm font-body text-sm"
                value={selectedAddressId}
                onChange={(e) => handleAddressSelect(e.target.value)}
                disabled={addressesLoading || savedAddresses.length === 0}
              >
                <option value="">Use a new address</option>
                {savedAddresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} - {address.address_line1}, {address.city}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 font-body text-sm">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                Save this address for future checkouts
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="font-body text-sm font-medium">Full Name</label>
                <Input
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="font-body text-sm font-medium">Phone</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="font-body text-sm font-medium">Address Line 1</label>
                <Input
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="font-body text-sm font-medium">Address Line 2</label>
                <Input
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm font-medium">City</label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-body text-sm font-medium">State</label>
                  <Input
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="font-body text-sm font-medium">Postal Code</label>
                <Input
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="w-4 h-4"
                />
                <span className="font-body">Pay Online</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="w-4 h-4"
                />
                <span className="font-body">Cash on Delivery</span>
              </label>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="font-display text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex justify-between font-body">
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span>₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex justify-between font-body mb-2">
                  <span>Subtotal</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-body text-muted-foreground mb-2">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between font-display text-xl">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
