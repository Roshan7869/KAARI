import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/server-rate-limit';
import { validateCsrfToken } from '@/lib/csrf-server';
import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/auth-client';
import { requireSupabaseUserId } from '@/lib/clerk-to-supabase';
import { ReturnRequestSchema } from '@/lib/validations/payment.schema';

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  item_type?: string;
  product: { title: string; slug: string } | null;
};

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
  order_items: OrderItem[];
  order_status_events: { new_status: string; created_at: string }[];
};

const RETURN_WINDOW_DAYS = 7;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = await requireSupabaseUserId(clerkUserId);

    const { id: orderId } = await params;
    const supabase = await createUserClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, user_id, status,
        order_items(id, product_id, quantity, unit_price, item_type,
          product:product_id(title, slug)),
        order_status_events(new_status, created_at)
      `)
      .eq('id', orderId)
      .single() as unknown as { data: OrderRow | null; error: Error | null };

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.user_id !== userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check eligibility
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { eligible: false, reason: 'Order must be delivered before requesting a return' },
        { status: 422 }
      );
    }

    const deliveryEvent = order.order_status_events
      .filter((e) => e.new_status === 'delivered')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (deliveryEvent) {
      const daysSince = Math.floor(
        (Date.now() - new Date(deliveryEvent.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > RETURN_WINDOW_DAYS) {
        return NextResponse.json(
          { eligible: false, reason: `Return window of ${RETURN_WINDOW_DAYS} days has expired` },
          { status: 422 }
        );
      }
    }

    // Check for existing return request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('return_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { eligible: false, reason: 'A return request already exists for this order', existingRequest: existing },
        { status: 422 }
      );
    }

    return NextResponse.json({
      eligible: true,
      order: {
        id: order.id,
        status: order.status,
        items: order.order_items.map((item) => ({
          id: item.id,
          productTitle: item.product?.title ?? 'Unknown Product',
          productSlug: item.product?.slug ?? '',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          isCustom: item.item_type === 'customized',
        })),
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request, 'mutation');
  if (rateLimitResponse) return rateLimitResponse;

  const csrfValid = await validateCsrfToken(request);
  if (!csrfValid) {
    return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
  }

  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = await requireSupabaseUserId(clerkUserId);

    const { id: orderId } = await params;

    const body = await request.json();
    const parsed = ReturnRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 });
    }
    const { items, reason, description, photos } = parsed.data;

    const supabase = await createUserClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership + delivery status (re-check server-side)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, order_status_events(new_status, created_at)')
      .eq('id', orderId)
      .single() as unknown as { data: { id: string; user_id: string; status: string; order_status_events: { new_status: string; created_at: string }[] } | null; error: Error | null };

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.user_id !== userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Order is not delivered' }, { status: 422 });
    }

    const deliveryEvent = order.order_status_events
      .filter((e) => e.new_status === 'delivered')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (deliveryEvent) {
      const daysSince = Math.floor(
        (Date.now() - new Date(deliveryEvent.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > RETURN_WINDOW_DAYS) {
        return NextResponse.json({ error: 'Return window has expired' }, { status: 422 });
      }
    }

    // Create return request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: returnRequest, error: insertError } = await (supabase as any)
      .from('return_requests')
      .insert({
        order_id: orderId,
        user_id: userId,
        items: body.items,
        reason: body.reason,
        description: body.description ?? null,
        photos: body.photos ?? [],
        status: 'requested',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, returnRequestId: returnRequest.id });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
