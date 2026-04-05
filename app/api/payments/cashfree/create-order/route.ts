import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCashfreeBaseUrl, getServerCashfreeConfig } from '@/lib/cashfree-server'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const CreateOrderSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  returnUrl: z.string().url(),
  notifyUrl: z.string().url(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const payload = CreateOrderSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment order payload' },
        { status: 400 }
      )
    }

    const { orderId, amount, customerName, customerEmail, customerPhone, returnUrl, notifyUrl } =
      payload.data

    const admin = createAdminClient()
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, user_id, total_amount')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    if (order.user_id !== user.id) {
      logger.warn('Unauthorized order payment attempt', { orderId, userId: user.id })
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const orderAmount = typeof order.total_amount === 'number'
      ? order.total_amount
      : Number(order.total_amount)

    // Compare in paise (×100, rounded) to avoid floating-point precision issues.
    // e.g. 1.1 + 2.2 = 3.3000000000000003 in JS — integer comparison is exact.
    const orderPaise = Math.round(orderAmount * 100);
    const requestedPaise = Math.round(amount * 100);
    if (orderPaise !== requestedPaise) {
      logger.warn('Cashfree amount mismatch', { orderId, orderAmount, requestedAmount: amount })
      return NextResponse.json({ success: false, error: 'Invalid payment amount' }, { status: 400 })
    }

    const config = await getServerCashfreeConfig()
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Cashfree is not configured' },
        { status: 503 }
      )
    }

    const paymentSessionId = `pay_${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const redirectBackUrl = new URL(returnUrl)
    redirectBackUrl.searchParams.set('session_id', paymentSessionId)

    const { error: paymentSessionError } = await admin.from('payment_sessions').insert({
      session_id: paymentSessionId,
      order_id: orderId,
      user_id: user.id,
      amount,
      currency: 'INR',
      payment_method: 'upi',
      status: 'pending',
      expires_at: expiresAt,
    })

    if (paymentSessionError) {
      throw paymentSessionError
    }

    const cfOrderId = `KH${orderId.slice(0, 8)}`
    const response = await fetch(`${getCashfreeBaseUrl(config.isTestMode)}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: amount,
        order_currency: 'INR',
        order_note: `Kaari Order ${orderId.slice(0, 8)}`,
        customer_details: {
          customer_id: orderId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: redirectBackUrl.toString(),
          notify_url: notifyUrl,
          payment_methods: 'upi',
        },
      }),
    })

    const responseText = await response.text()
    const responseData = responseText ? JSON.parse(responseText) as Record<string, unknown> : {}

    if (!response.ok) {
      logger.warn('Cashfree create-order request failed', { status: response.status, orderId })
      return NextResponse.json(
        {
          success: false,
          error: String(responseData.message || responseData.error || 'Failed to create Cashfree order'),
        },
        { status: response.status }
      )
    }

    await admin.from('cashfree_sessions').insert({
      order_id: orderId,
      cf_order_id: String(responseData.cf_order_id || ''),
      cf_payment_session_id: String(responseData.payment_session_id || ''),
      amount,
      currency: 'INR',
      status: 'created',
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_name: customerName,
      return_url: returnUrl,
      notify_url: notifyUrl,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      raw_response: responseData,
    })

    return NextResponse.json({
      success: true,
      sessionId: paymentSessionId,
      redirectUrl: `/payment?session_id=${encodeURIComponent(paymentSessionId)}&cf_session_id=${encodeURIComponent(String(responseData.payment_session_id || ''))}`,
      data: responseData,
    })
  } catch (error) {
    const err = error as Error
    logger.error('Failed to create Cashfree order via Next.js API', { message: err.message })
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create Cashfree order' },
      { status: 500 }
    )
  }
}
