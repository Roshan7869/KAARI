import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

/**
 * Cashfree Payment Gateway Edge Function
 *
 * SECURITY: This function handles ALL Cashfree API calls server-side.
 * API secrets are NEVER exposed to the client.
 *
 * Endpoints:
 * - POST /create-order - Create a new payment order
 * - GET /session/:sessionId - Get payment session status
 * - POST /verify-payment - Verify payment status from Cashfree
 */

interface CreateOrderRequest {
  orderId: string
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  returnUrl: string
  notifyUrl: string
}

interface CashfreeConfig {
  appId: string
  secretKey: string
  isTestMode: boolean
  webhookSecret: string
}

/**
 * Get Cashfree configuration from database
 * Uses service role to access payment_gateways table
 */
async function getCashfreeConfig(supabase: ReturnType<typeof createClient>): Promise<CashfreeConfig | null> {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('provider', 'cashfree')
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    console.log('Cashfree gateway not configured, using dummy mode')
    return null
  }

  return {
    appId: data.api_key || '',
    secretKey: data.api_secret || '',
    isTestMode: data.is_test_mode ?? true,
    webhookSecret: data.webhook_secret || '',
  }
}

/**
 * Get Cashfree API base URL based on mode
 */
function getCashfreeBaseUrl(isTestMode: boolean): string {
  return isTestMode
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg'
}

/**
 * Create a Cashfree order
 */
async function createCashfreeOrder(
  config: CashfreeConfig,
  params: CreateOrderRequest
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const baseUrl = getCashfreeBaseUrl(config.isTestMode)
  const cfOrderId = `KH${params.orderId.slice(0, 8)}`

  // UPI only as per business requirements
  const UPI_PAYMENT_METHOD = 'upi'

  const orderPayload = {
    order_id: cfOrderId,
    order_amount: params.amount,
    order_currency: 'INR',
    order_note: `Kaari Order ${params.orderId.slice(0, 8)}`,
    customer_details: {
      customer_id: params.orderId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
      payment_methods: UPI_PAYMENT_METHOD,
    },
  }

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
      body: JSON.stringify(orderPayload),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Cashfree order creation failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to create Cashfree order',
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Cashfree API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get payment session from Cashfree
 */
async function getCashfreePaymentSession(
  config: CashfreeConfig,
  sessionId: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const baseUrl = getCashfreeBaseUrl(config.isTestMode)

  try {
    const response = await fetch(`${baseUrl}/orders/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
    })

    if (!response.ok) {
      return { success: false, error: 'Session not found' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Cashfree session fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

serve(async (req) => {
  // SECURITY: Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  // SECURITY: Validate Content-Type
  const contentType = req.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return new Response(
      JSON.stringify({ error: 'Content-Type must be application/json' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      )
    }

    const body = await req.json()
    const { action, ...params } = body

    // Get Cashfree configuration
    const config = await getCashfreeConfig(supabase)

    if (!config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment gateway not configured. Please contact support.',
          fallback: 'dummy',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      )
    }

    let result

    switch (action) {
      case 'create-order': {
        // SECURITY: Verify order belongs to user
        const { data: order } = await supabase
          .from('orders')
          .select('id, user_id, total_amount, status')
          .eq('id', params.orderId)
          .maybeSingle()

        if (!order) {
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        if (order.user_id !== user.id) {
          console.warn('SECURITY: Unauthorized order access attempt', {
            orderId: params.orderId,
            orderUserId: order.user_id,
            currentUserId: user.id,
          })
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // SECURITY: Verify amount matches order total
        if (params.amount !== order.total_amount) {
          console.warn('SECURITY: Amount mismatch attempt', {
            orderId: params.orderId,
            requestedAmount: params.amount,
            orderAmount: order.total_amount,
          })
          return new Response(
            JSON.stringify({ error: 'Invalid payment amount' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        result = await createCashfreeOrder(config, params)

        if (result.success && result.data) {
          // Store session in database
          await supabase.from('cashfree_sessions').insert({
            order_id: params.orderId,
            cf_order_id: (result.data as Record<string, unknown>).cf_order_id,
            cf_payment_session_id: (result.data as Record<string, unknown>).payment_session_id,
            amount: params.amount,
            currency: 'INR',
            status: 'created',
            customer_email: params.customerEmail,
            customer_phone: params.customerPhone,
            customer_name: params.customerName,
            return_url: params.returnUrl,
            notify_url: params.notifyUrl,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            raw_response: result.data,
          })
        }
        break
      }

      case 'get-session': {
        result = await getCashfreePaymentSession(config, params.sessionId)
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'X-Content-Type-Options': 'nosniff',
            },
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  } catch (error) {
    console.error('Cashfree payment function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
  }
})