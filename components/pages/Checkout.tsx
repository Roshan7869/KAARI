'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { sanitizeTextInput, validatePhone } from '@/lib/sanitization';
import { PHONE_ERROR_MSG } from '@/lib/validation/phone';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf-server';
import { TrustBadges } from '@/components/TrustBadges';
import { startOnlinePaymentFlow } from '@/lib/checkout/client';
import {
  SavedAddressSelector,
  ContactInfoForm,
  ShippingAddressForm,
  PaymentMethodSelector,
  CourierSelector,
  OrderSummary,
} from '@/components/checkout';
import type { SavedAddress, CourierKey } from '@/components/checkout';
import { COURIER_OPTIONS } from '@/components/checkout';

// ── Schema ──────────────────────────────────────────────────────────────
const checkoutSchema = z.object({
  full_name: z.string().min(2, 'Full name is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  email: z.string().email('Valid email is required for order updates').optional(),
  phone: z.string().min(10, 'Phone number is required').max(20).refine(validatePhone, PHONE_ERROR_MSG),
  address_line1: z.string().min(5, 'Address line 1 is required').max(200).transform((value) => sanitizeTextInput(value, 200)),
  address_line2: z.string().max(100).transform((value) => sanitizeTextInput(value, 100)).optional(),
  city: z.string().min(2, 'City is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  state: z.string().min(2, 'State is required').max(100).transform((value) => sanitizeTextInput(value, 100)),
  postal_code: z.string().length(6, 'PIN code must be exactly 6 digits').regex(/^[1-9][0-9]{5}$/, 'Invalid Indian PIN code format'),
}).refine(() => {
  // Guest users must provide email
  return true; // Additional validation handled at submit time
});

export default function Checkout() {
  const { user } = useAuth();
  const { user: clerkUser } = useUser();
  const { cart, refreshCart } = useCart();
  const items = cart?.items ?? [];
  const total = cart?.pricing.total ?? 0;
  const router = useRouter();

  const isGuest = !clerkUser;
  const isEmailUnverified = !!clerkUser && clerkUser.primaryEmailAddress?.verification?.status !== 'verified';

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
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
  const [csrfToken, setCsrfToken] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [pincodeLookupDone, setPincodeLookupDone] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Cart Review, 2: Shipping, 3: Payment, 4: Confirmation
  const submittingRef = useRef(false);

  // Fix: Read CSRF token in useEffect to avoid SSR/client hydration mismatch
  useEffect(() => {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(c => c.trim().startsWith(CSRF_COOKIE_NAME + '='));
    setCsrfToken(csrfCookie ? csrfCookie.split('=')[1] : '');
  }, []);

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

  const handlePincodeChange = (value: string) => {
    setFormData(prev => ({ ...prev, postal_code: value }));
    setPincodeLookupDone(false);
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
      email: formData.email,
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

  const handleCouponInputChange = (value: string) => {
    setCouponInput(value);
    setCouponError(null);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
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
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;

    if (!user || items.length === 0) return;

    // Guest users must provide email
    if (isGuest && !formData.email.trim()) {
      setFormError('Please provide your email address for order updates.');
      submittingRef.current = false;
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    // Block checkout if email is not verified (authenticated users only)
    if (isEmailUnverified) {
      setFormError('Please verify your email address before placing an order.');
      return;
    }
    // CSRF token is now validated server-side via cookie + header comparison
    // The HTTP-only cookie is set by middleware, and the header is sent in the fetch call

    setLoading(true);
    setIsSubmitting(true);
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

      if (!cart?.cartId) throw new Error('Cart not found');

      const checkoutBody: Record<string, unknown> = {
        cart_id: cart.cartId,
        payment_method: paymentMethod,
        email: user.email || validatedForm.email || undefined,
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
      };

      // For guest checkout, send cart items directly
      if (isGuest && items.length > 0) {
        checkoutBody.items = items.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId || undefined,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          item_type: item.itemType,
        }));
      }

      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify(checkoutBody),
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

      // Order confirmed — advance the stepper now
      setCheckoutStep(3);

      await refreshCart();

      // Redirect to order confirmation or payment
      if (paymentMethod === 'cod') {
        router.push(`/order-confirmation/${orderId}`);
      } else {
        const redirectUrl = await startOnlinePaymentFlow({
          orderId,
          amount: checkoutData.data?.totals?.grandTotal ?? total,
          customerName: validatedForm.full_name,
          customerEmail: user.email || 'customer@kaari.in',
          customerPhone: validatedForm.phone,
        });
        router.push(redirectUrl);
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
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    // Only redirect if cart is empty (guest users can still checkout)
    if (items.length === 0 && !isGuest) {
      router.replace('/cart');
    }
  }, [items.length, router, isGuest]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>
      {isEmailUnverified && (
        <div
          className="mb-4 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 font-body text-sm text-amber-800"
          role="alert"
          aria-live="polite"
        >
          <strong>Please verify your email address before placing an order.</strong>
          {' '}Check your inbox for a verification email.{' '}
          <a href="/account" className="underline font-medium hover:text-amber-900">
            Manage your email settings
          </a>.
        </div>
      )}
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
          <SavedAddressSelector
            addresses={savedAddresses}
            selectedId={selectedAddressId}
            loading={addressesLoading}
            saveChecked={saveAddress}
            onSelect={handleAddressSelect}
            onSaveToggle={setSaveAddress}
          />

          <ContactInfoForm
            formData={{ email: formData.email, full_name: formData.full_name, phone: formData.phone }}
            isGuest={isGuest}
            formError={formError}
            onChange={handleInputChange}
          />

          <ShippingAddressForm
            formData={{
              address_line1: formData.address_line1,
              address_line2: formData.address_line2,
              city: formData.city,
              state: formData.state,
              postal_code: formData.postal_code,
            }}
            formError={formError}
            onChange={handleInputChange}
            onPincodeBlur={handlePincodeLookup}
            onPincodeChange={handlePincodeChange}
            pincodeLoading={pincodeLookupLoading}
            pincodeDone={pincodeLookupDone}
          />

          <PaymentMethodSelector
            value={paymentMethod}
            onChange={setPaymentMethod}
          />

          <CourierSelector
            value={shippingProvider}
            onChange={setShippingProvider}
            otherLabel={shippingProviderLabel}
            onOtherLabelChange={setShippingProviderLabel}
          />
        </div>

        <OrderSummary
          items={items}
          cartPricing={cart?.pricing}
          total={total}
          appliedCoupon={appliedCoupon}
          couponInput={couponInput}
          couponLoading={couponLoading}
          couponError={couponError}
          onCouponInputChange={handleCouponInputChange}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          loading={loading}
          isSubmitting={isSubmitting}
          shippingProvider={shippingProvider}
          shippingProviderLabel={shippingProviderLabel}
        />
      </form>
      <TrustBadges />
    </div>
  );
}
