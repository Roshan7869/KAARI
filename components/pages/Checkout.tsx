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
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { TrustBadges } from '@/components/TrustBadges';

// ── Courier Options ─────────────────────────────────────────────────────
export type CourierKey = 'INDIA_POST' | 'TIRUPATI_BALAJI' | 'DTDC' | 'DELHIVERY' | 'BLUEDART' | 'OTHER';

export const COURIER_OPTIONS: Array<{ key: CourierKey; label: string; eta: string; badge?: string; icon: string }> = [
  { key: 'INDIA_POST',      label: 'India Post',               eta: '7–10 days', badge: 'Economy',  icon: '📮' },
  { key: 'TIRUPATI_BALAJI', label: 'Tirupati Balaji Couriers', eta: '4–7 days',  badge: 'Standard', icon: '🚚' },
  { key: 'DTDC',            label: 'DTDC',                     eta: '3–5 days',  badge: 'Express',  icon: '📦' },
  { key: 'DELHIVERY',       label: 'Delhivery',                eta: '2–4 days',  badge: 'Fast',     icon: '⚡' },
  { key: 'BLUEDART',        label: 'Blue Dart (DHL)',           eta: '1–3 days',  badge: 'Premium',  icon: '✈️'  },
  { key: 'OTHER',           label: 'Other (specify below)',     eta: 'Varies',                       icon: '✏️'  },
];

const checkoutSchema = z.object({
  full_name: z.string().min(2, 'Full name is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  phone: z.string().min(10, 'Phone number is required').max(20).refine(validatePhone, 'Invalid phone number'),
  address_line1: z.string().min(5, 'Address line 1 is required').max(200).transform((value) => sanitizeTextInput(value, 200)),
  address_line2: z.string().max(100).transform((value) => sanitizeTextInput(value, 100)).optional(),
  city: z.string().min(2, 'City is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  state: z.string().min(2, 'State is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  postal_code: z.string().length(6, 'PIN code must be exactly 6 digits').regex(/^[1-9][0-9]{5}$/, 'Invalid Indian PIN code format'),
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
  const { cart, refreshCart } = useCart();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [shippingProvider, setShippingProvider] = useState<CourierKey>('INDIA_POST');
  const [shippingProviderLabel, setShippingProviderLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [csrfToken] = useState(() => generateCsrfToken());
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [pincodeLookupDone, setPincodeLookupDone] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Cart Review, 2: Shipping, 3: Payment, 4: Confirmation

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string;
    code: string;
    discount: number;
    description: string;
  } | null>(null);

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

  const handlePincodeLookup = async (e: React.FocusEvent<HTMLInputElement>) => {
    const pin = e.target.value.trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    setPincodeLookupLoading(true);
    setPincodeLookupDone(false);
    try {
      const res = await fetch(`/api/pincode/${pin}`);
      if (res.ok) {
        const { city, state } = await res.json();
        setFormData((prev) => ({ ...prev, city, state }));
        setPincodeLookupDone(true);
      }
    } catch {
      // Fail silently — user can still type manually
    } finally {
      setPincodeLookupLoading(false);
    }
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

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    setAppliedCoupon(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: total }),
      });
      const data = await res.json() as {
        valid: boolean;
        error?: string;
        couponId?: string;
        code?: string;
        discount?: number;
        description?: string;
      };
      if (!data.valid) {
        setCouponError(data.error ?? 'Invalid coupon code');
      } else {
        setAppliedCoupon({
          couponId: data.couponId!,
          code: data.code!,
          discount: data.discount!,
          description: data.description!,
        });
      }
    } catch {
      setCouponError('Failed to validate coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      // Prevent double submission - this is intentional for debugging
      return;
    }

    if (!user || items.length === 0) return;
    const form = e.currentTarget as HTMLFormElement;
    const submittedCsrfToken = new FormData(form).get('csrf_token') as string | null;
    if (!validateCsrfToken(submittedCsrfToken ?? '')) {
      setFormError('Session validation failed. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);
    setFormError(null);
    setCheckoutStep(3); // Moving to payment step
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

      if (!cart?.cartId) throw new Error('Cart not found');

      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart_id: cart.cartId,
          payment_method: paymentMethod,
          email: user.email || undefined,
          phone: validatedForm.phone,
          shipping_name: validatedForm.full_name,
          shipping_line1: validatedForm.address_line1,
          shipping_line2: validatedForm.address_line2 || undefined,
          shipping_city: validatedForm.city,
          shipping_state: validatedForm.state,
          shipping_postal_code: validatedForm.postal_code,
          shipping_country: 'IN',
          shipping_method: 'standard',
          shipping_amount: cart.pricing.shipping,
          tax_amount: cart.pricing.tax,
          shipping_provider: shippingProvider,
          shipping_provider_label:
            shippingProvider === 'OTHER'
              ? shippingProviderLabel
              : COURIER_OPTIONS.find(o => o.key === shippingProvider)?.label ?? shippingProvider,
          ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
        }),
      });

      const checkoutData = await checkoutResponse.json() as {
        success?: boolean;
        error?: string;
        data?: {
          orderId?: string;
          totals?: { grandTotal?: number };
        };
      };

      if (!checkoutResponse.ok || !checkoutData.success) {
        throw new Error(checkoutData.error || 'Checkout failed');
      }

      const orderId = checkoutData.data?.orderId;
      if (!orderId) {
        throw new Error('Order could not be created');
      }

      await refreshCart();

      // Redirect to order confirmation or payment
      if (paymentMethod === 'cod') {
        router.push(`/order-confirmation/${orderId}`);
      } else {
        // Use NEXT_PUBLIC_APP_URL if available and valid, otherwise fallback to window.location.origin
        let appUrl = window.location.origin;
        const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

        // In production, validate that we're not using localhost
        if (envAppUrl && envAppUrl.length > 0) {
          if (process.env.NODE_ENV === 'production') {
            // In production, ensure we're not using localhost
            if (!envAppUrl.includes('localhost') && !envAppUrl.includes('127.0.0.1')) {
              appUrl = envAppUrl;
            }
            // If envAppUrl is localhost in production, stick with window.location.origin
          } else {
            // In development, allow localhost URLs
            appUrl = envAppUrl;
          }
        }

        const paymentResponse = await fetch('/api/payments/cashfree/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            amount: Number((checkoutData.data?.totals?.grandTotal ?? total).toFixed(2)),
            customerName: validatedForm.full_name,
            customerEmail: user.email || 'customer@kaari.in',
            customerPhone: validatedForm.phone,
            returnUrl: `${appUrl}/payment`,
            notifyUrl: `${appUrl}/api/webhooks/payment`,
          }),
        });

        const paymentData = await paymentResponse.json() as {
          success?: boolean;
          error?: string;
          redirectUrl?: string;
        };

        if (!paymentResponse.ok || !paymentData.success || !paymentData.redirectUrl) {
          throw new Error(paymentData.error || 'Failed to start payment flow');
        }
        router.push(paymentData.redirectUrl);
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
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    if (items.length === 0) {
      router.replace('/cart');
    }
  }, [items.length, router, user]);

  if (!user || items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>
      {formError ? (
        <p
          id="checkout-error"
          className="mb-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          {formError}
        </p>
      ) : null}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 h-2 mb-4 rounded-full overflow-hidden">
          <div
            className="bg-green-600 h-2 transition-all duration-500 ease-in-out rounded-full"
            style={{ width: `${(checkoutStep / 4) * 100}%` }}
          />
        </div>
        <div className="flex justify-between">
          {['Cart Review', 'Shipping', 'Payment', 'Confirmation'].map((step, index) => (
            <div key={step} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index + 1 <= checkoutStep
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index + 1}
              </div>
              <span className={`text-xs mt-2 ${
                index + 1 <= checkoutStep
                  ? 'text-green-600 font-medium'
                  : 'text-gray-500'
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

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
                aria-label="Select saved address or enter new address"
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
                <label htmlFor="full_name" className="font-body text-sm font-medium">Full Name</label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                  aria-label="Full Name (required)"
                  aria-required="true"
                  aria-describedby={formError ? "checkout-error" : undefined}
                />
              </div>
              <div>
                <label htmlFor="phone" className="font-body text-sm font-medium">Phone</label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                  aria-label="Phone number (required)"
                  aria-required="true"
                  aria-describedby={formError ? "checkout-error" : undefined}
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
                <label htmlFor="address_line1" className="font-body text-sm font-medium">Address Line 1</label>
                <Input
                  id="address_line1"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                  aria-label="Street address (required)"
                  aria-required="true"
                  aria-describedby={formError ? "checkout-error" : undefined}
                />
              </div>
              <div>
                <label htmlFor="address_line2" className="font-body text-sm font-medium">Address Line 2</label>
                <Input
                  id="address_line2"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  className="mt-1"
                  aria-label="Apartment, suite, etc. (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="font-body text-sm font-medium">City</label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                    aria-label="City (required)"
                    aria-required="true"
                    aria-describedby={formError ? "checkout-error" : undefined}
                  />
                </div>
                <div>
                  <label htmlFor="state" className="font-body text-sm font-medium">State</label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                    aria-label="State (required)"
                    aria-required="true"
                    aria-describedby={formError ? "checkout-error" : undefined}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="postal_code" className="font-body text-sm font-medium">Postal Code</label>
                <div className="relative mt-1">
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => {
                      // Strip non-digits and limit to 6 characters
                      const numericValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setFormData({ ...formData, postal_code: numericValue });
                      setPincodeLookupDone(false);
                    }}
                    onBlur={handlePincodeLookup}
                    inputMode="numeric"
                    pattern="[1-9][0-9]{5}"
                    maxLength={6}
                    required
                    className="mt-0 pr-8"
                    aria-label="Postal code or ZIP (required) - 6 digits only"
                    aria-required="true"
                    aria-describedby={formError ? "checkout-error" : undefined}
                  />
                  {pincodeLookupLoading && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                      …
                    </span>
                  )}
                  {pincodeLookupDone && !pincodeLookupLoading && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 text-xs" aria-label="City and state auto-filled">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl" id="payment-method-title">Payment Method</CardTitle>
            </CardHeader>
            <CardContent
              className="space-y-4"
              role="group"
              aria-labelledby="payment-method-title"
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="w-4 h-4"
                  aria-label="Pay Online - Pay by card or UPI"
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
                  aria-label="Cash on Delivery - Pay when you receive"
                />
                <span className="font-body">Cash on Delivery</span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl" id="courier-title">Delivery Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="font-body text-sm font-medium block">Select delivery provider</label>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                role="group"
                aria-labelledby="courier-title"
              >
                {COURIER_OPTIONS.map(opt => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                      shippingProvider === opt.key
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-input hover:border-amber-700/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      value={opt.key}
                      checked={shippingProvider === opt.key}
                      onChange={() => setShippingProvider(opt.key)}
                      className="mt-0.5 accent-amber-700"
                      aria-label={`${opt.label} - estimated delivery ${opt.eta}`}
                    />
                    <span className="text-lg flex-shrink-0" aria-hidden="true">{opt.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium font-body truncate">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">Est. {opt.eta}</span>
                    </span>
                    {opt.badge && (
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${
                        shippingProvider === opt.key
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {shippingProvider === 'OTHER' && (
                <div>
                  <label htmlFor="courier-name" className="font-body text-sm font-medium block mb-1">Courier name</label>
                  <Input
                    id="courier-name"
                    type="text"
                    placeholder="Enter courier / delivery service name"
                    value={shippingProviderLabel}
                    onChange={e => setShippingProviderLabel(e.target.value)}
                    className="mt-1"
                    required={shippingProvider === 'OTHER'}
                    aria-label="Custom courier or delivery service name"
                    aria-required={shippingProvider === 'OTHER'}
                  />
                </div>
              )}
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
              <div className="border-t pt-4 space-y-2">
                {/* Coupon Input */}
                {!appliedCoupon ? (
                  <div className="space-y-1.5 pb-2">
                    <label className="font-body text-sm font-medium">Have a coupon?</label>
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                        placeholder="COUPON CODE"
                        className="font-mono text-sm uppercase"
                        maxLength={50}
                        disabled={couponLoading}
                        aria-label="Coupon code"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="shrink-0"
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="font-body text-xs text-red-600">{couponError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <span className="font-mono text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                        {appliedCoupon.code}
                      </span>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">{appliedCoupon.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                      className="font-body text-xs text-red-600 hover:underline ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex justify-between font-body">
                  <span>Subtotal</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-body text-muted-foreground">
                  <span>Shipping</span>
                  <span>
                    {cart?.pricing.shipping && cart.pricing.shipping > 0
                      ? `₹${cart.pricing.shipping.toLocaleString('en-IN')}`
                      : 'Free'}
                  </span>
                </div>
                {cart?.pricing.tax && cart.pricing.tax > 0 ? (
                  <div className="flex justify-between font-body text-muted-foreground">
                    <span>Tax</span>
                    <span>₹{cart.pricing.tax.toLocaleString('en-IN')}</span>
                  </div>
                ) : null}
                {appliedCoupon && (
                  <div className="flex justify-between font-body text-green-700">
                    <span>Discount</span>
                    <span>−₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-display text-xl border-t pt-2">
                  <span>Total</span>
                  <span>
                    ₹{Math.max(0,
                      total +
                      (cart?.pricing.shipping ?? 0) +
                      (cart?.pricing.tax ?? 0) -
                      (appliedCoupon?.discount ?? 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || isSubmitting || (shippingProvider === 'OTHER' && !shippingProviderLabel.trim())}
              >
                {loading ? 'Placing Order...' : `Place Order — ₹${Math.max(0,
                  total +
                  (cart?.pricing.shipping ?? 0) +
                  (cart?.pricing.tax ?? 0) -
                  (appliedCoupon?.discount ?? 0)
                ).toLocaleString('en-IN')}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
      <TrustBadges />
    </div>
  );
}
