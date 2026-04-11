import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type CouponRow = {
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
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string; subtotal?: number };
    const { code, subtotal } = body;

    if (!code || typeof subtotal !== 'number') {
      return NextResponse.json(
        { valid: false, error: 'code and subtotal are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon, error } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single() as unknown as { data: CouponRow | null; error: Error | null };

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired coupon code' });
    }

    const now = new Date();

    if (new Date(coupon.valid_from) > now) {
      return NextResponse.json({ valid: false, error: 'Coupon is not yet active' });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ valid: false, error: 'Coupon has expired' });
    }

    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json({ valid: false, error: 'Coupon has been fully redeemed' });
    }

    if (subtotal < coupon.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of ₹${coupon.min_order_amount.toLocaleString('en-IN')} required`,
      });
    }

    let discount: number;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.max_discount_amount !== null) {
        discount = Math.min(discount, coupon.max_discount_amount);
      }
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    discount = Math.round(discount * 100) / 100;
    const finalAmount = Math.max(0, subtotal - discount);

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discount,
      finalAmount,
      description: coupon.type === 'percentage'
        ? `${coupon.value}% off${coupon.max_discount_amount ? ` (max ₹${coupon.max_discount_amount})` : ''}`
        : `₹${coupon.value} off`,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { valid: false, error: err.message || 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
