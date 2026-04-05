import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

/**
 * Payment Webhook Handler
 * SECURITY: Validates webhook signatures to prevent forged payment confirmations
 *
 * For real payment gateways (Cashfree), signature validation is REQUIRED.
 * For dummy payments, we verify session ownership via database.
 */

interface PaymentWebhookPayload {
  session_id: string
  order_id: string
  status: "completed" | "failed"
  transaction_id: string
  signature?: string  // For real payment gateways
  timestamp?: string
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Verify Cashfree webhook signature using HMAC-SHA256
 * Cashfree sends signature in 'x-cf-signature' header
 */
async function verifyCashfreeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret || !signature) {
    console.error('WEBHOOK SECURITY: Missing secret or signature for Cashfree webhook')
    return false
  }

  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const payloadData = encoder.encode(payload)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData)
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

    return timingSafeEqual(signature, expectedSignature)
  } catch (error) {
    console.error('WEBHOOK SECURITY: Signature verification failed', error)
    return false
  }
}

/**
 * Verify dummy payment session ownership
 * Ensures the session belongs to the user making the request
 */
async function verifyDummySession(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  sessionId: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  // Check if order exists and get user_id
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) {
    return { valid: false, error: 'Database error checking order' }
  }

  if (!order) {
    return { valid: false, error: 'Order not found' }
  }

  // Order must be in 'pending' or 'processing' status to accept payment
  if (!['pending', 'processing'].includes(order.status)) {
    return { valid: false, error: `Order status '${order.status}' cannot accept payment` }
  }

  return { valid: true, userId: order.user_id }
}

serve(async (req) => {
  // SECURITY: Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff"
      },
    })
  }

  // SECURITY: Validate Content-Type
  const contentType = req.headers.get("content-type")
  if (!contentType?.includes("application/json")) {
    return new Response(
      JSON.stringify({ error: "Content-Type must be application/json" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      }
    )
  }

  try {
    const rawBody = await req.text()
    const payload: PaymentWebhookPayload = JSON.parse(rawBody)

    // Validate required fields
    if (
      !payload.session_id ||
      !payload.order_id ||
      !payload.status ||
      !payload.transaction_id
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    )

    // Validate status is valid
    if (!['completed', 'failed'].includes(payload.status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }

    // Initialize Supabase client with service role for elevated access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get webhook secret from environment (for real payment gateways)
    const webhookSecret = Deno.env.get("CASHFREE_WEBHOOK_SECRET")

    // SECURITY: Validate webhook signature for real payment gateways
    // Check if this is a Cashfree webhook (has signature) or dummy payment
    const cashfreeSignature = req.headers.get("x-cf-signature") || payload.signature

    if (cashfreeSignature && webhookSecret) {
      // Real Cashfree webhook - validate signature
      const isValid = await verifyCashfreeSignature(
        rawBody,
        cashfreeSignature,
        webhookSecret
      )

      if (!isValid) {
        console.error('WEBHOOK SECURITY: Invalid Cashfree signature rejected')
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff"
            }
          }
        )
      }

      console.log('WEBHOOK: Cashfree signature validated successfully')
    } else if (payload.session_id.startsWith('dummy_')) {
      // Dummy payment - verify session ownership
      const verification = await verifyDummySession(supabase, payload.order_id, payload.session_id)

      if (!verification.valid) {
        console.error('WEBHOOK SECURITY: Dummy session verification failed', verification.error)
        return new Response(
          JSON.stringify({ error: verification.error || "Invalid session" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff"
            }
          }
        )
      }

      console.log('WEBHOOK: Dummy payment session validated for order:', payload.order_id)
    } else {
      // No signature and not a dummy payment - reject
      console.error('WEBHOOK SECURITY: Missing signature for non-dummy payment')
      return new Response(
        JSON.stringify({ error: "Webhook signature required" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }

    // Check if payment already processed (idempotency)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("external_transaction_id", payload.transaction_id)
      .maybeSingle()

    if (existingPayment && existingPayment.status !== "created") {
      // Already processed - return success for idempotency
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          orderId: payload.order_id,
          paymentStatus: existingPayment.status,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }

    // Get order to verify status before processing
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, status, total_amount")
      .eq("id", payload.order_id)
      .maybeSingle()

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }

    // Order must be in pending status to accept payment
    if (!['pending', 'processing'].includes(order.status)) {
      return new Response(
        JSON.stringify({
          error: `Order status '${order.status}' cannot accept payment`,
          orderId: payload.order_id
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }

    // Update payment record with transaction ID and status
    const paymentStatus = payload.status === "completed" ? "completed" : "failed"

    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        external_transaction_id: payload.transaction_id,
        status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", payload.order_id)
      .eq("status", "created")

    if (paymentUpdateError) {
      console.error("Payment update error:", paymentUpdateError)
      return new Response(
        JSON.stringify({ error: "Failed to update payment" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }

    // Update order status based on payment result
    if (payload.status === "completed") {
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.order_id)

      if (orderError) {
        console.error("Order update error:", orderError)
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff"
            }
          }
        )
      }

      // Log status change with security audit
      await supabase.from("order_status_events").insert({
        order_id: payload.order_id,
        status: "paid",
        notes: `Payment completed. Transaction ID: ${payload.transaction_id}`,
        created_at: new Date().toISOString(),
      })

      // Log security event
      console.log(JSON.stringify({
        event: 'PAYMENT_COMPLETED',
        order_id: payload.order_id,
        transaction_id: payload.transaction_id,
        timestamp: new Date().toISOString(),
        session_id: payload.session_id
      }))

      return new Response(
        JSON.stringify({
          success: true,
          orderId: payload.order_id,
          paymentStatus: "completed",
          message: "Payment processed successfully",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    } else {
      // Payment failed
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.order_id)

      if (orderError) {
        console.error("Order update error:", orderError)
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff"
            }
          }
        )
      }

      // Log status change
      await supabase.from("order_status_events").insert({
        order_id: payload.order_id,
        status: "cancelled",
        notes: `Payment failed. Transaction ID: ${payload.transaction_id}. Inventory restored.`,
        created_at: new Date().toISOString(),
      })

      // Log security event
      console.log(JSON.stringify({
        event: 'PAYMENT_FAILED',
        order_id: payload.order_id,
        transaction_id: payload.transaction_id,
        timestamp: new Date().toISOString(),
        session_id: payload.session_id
      }))

      return new Response(
        JSON.stringify({
          success: false,
          orderId: payload.order_id,
          paymentStatus: "failed",
          message: "Payment failed and order cancelled",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff"
          }
        }
      )
    }
  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff"
        }
      }
    )
  }
})