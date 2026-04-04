import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

interface Notification {
  id: string
  recipient: string
  subject: string | null
  content: string
  type: string
  channel: string
  metadata: Record<string, unknown> | null
}

interface EmailResult {
  ok: boolean
  providerResponse?: Record<string, unknown>
  error?: string
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/**
 * Send email via Resend API
 */
async function sendEmail(
  resendApiKey: string | null,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<EmailResult> {
  // If no API key, log and return success (dry run mode)
  if (!resendApiKey) {
    console.log(
      JSON.stringify({
        event: "NOTIFICATION_DRY_RUN",
        provider: "resend",
        to,
        subject,
        html_length: html.length,
      }),
    )
    return { ok: true, providerResponse: { dry_run: true } }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for plain text fallback
      }),
    })

    const responseBody = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error("Resend API error:", {
        status: response.status,
        error: responseBody,
      })
      return {
        ok: false,
        error: responseBody.message || `HTTP ${response.status}`,
        providerResponse: responseBody
      }
    }

    console.log("Email sent successfully:", {
      id: responseBody.id,
      to,
      subject,
    })

    return { ok: true, providerResponse: responseBody }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Exception sending email:", errorMessage)
    return { ok: false, error: errorMessage }
  }
}

/**
 * Build HTML email body from notification
 * Uses pre-rendered HTML from metadata if available, otherwise wraps content
 */
function buildEmailContent(notification: Notification): { html: string; text: string } {
  const metadata = notification.metadata as Record<string, unknown> | null

  // Check if we have pre-rendered HTML content in metadata
  if (metadata?.html_content && typeof metadata.html_content === "string") {
    return {
      html: metadata.html_content,
      text: (metadata.text_content as string) || notification.content,
    }
  }

  // Fallback: wrap plain content in basic HTML structure
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.subject || "Kaari Notification"}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f5f1;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px;">
    <h1 style="color: #8B4513; font-family: 'Georgia', serif; margin: 0 0 20px 0;">Kaari</h1>
    <p style="color: #5c4a3a; font-size: 15px; line-height: 1.6;">${notification.content}</p>
    <hr style="border: none; border-top: 1px solid #e5ddd5; margin: 30px 0;">
    <p style="color: #a08070; font-size: 12px;">
      Questions? Contact us at <a href="mailto:hello@kaari.shop" style="color: #D2691E;">hello@kaari.shop</a>
    </p>
    <p style="color: #a08070; font-size: 11px;">
      &copy; ${new Date().getFullYear()} Kaari Handmade. All rights reserved.
    </p>
  </div>
</body>
</html>
`

  return {
    html,
    text: notification.content,
  }
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" })
  }

  // Validate environment
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase environment variables")
    return jsonResponse(500, { error: "Missing Supabase environment" })
  }

  // Get email configuration
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const fromEmail = Deno.env.get("NOTIFICATIONS_FROM_EMAIL") ?? "orders@kaari.shop"

  // Create Supabase client with service role for full access
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Fetch pending email notifications
  const { data: notifications, error: fetchError } = await supabase
    .from("notifications")
    .select("id, recipient, subject, content, type, channel, metadata")
    .eq("status", "pending")
    .eq("channel", "email")
    .order("created_at", { ascending: true })
    .limit(50)

  if (fetchError) {
    console.error("Failed to fetch notifications:", fetchError)
    return jsonResponse(500, { error: fetchError.message })
  }

  if (!notifications || notifications.length === 0) {
    return jsonResponse(200, {
      success: true,
      processed: 0,
      sent: 0,
      failed: 0,
      message: "No pending notifications",
    })
  }

  console.log(`Processing ${notifications.length} notifications`)

  let sent = 0
  let failed = 0
  const results: Array<{ id: string; status: string; error?: string }> = []

  // Process each notification
  for (const notification of notifications as Notification[]) {
    const subject = notification.subject ?? "Kaari Notification"
    const { html, text } = buildEmailContent(notification)

    const result = await sendEmail(
      resendApiKey,
      fromEmail,
      notification.recipient,
      subject,
      html,
      text,
    )

    if (result.ok) {
      // Mark as sent
      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_response: result.providerResponse ?? {},
        })
        .eq("id", notification.id)

      if (updateError) {
        console.error(`Failed to update notification ${notification.id}:`, updateError)
        // Still count as sent since email was delivered
      }

      sent += 1
      results.push({ id: notification.id, status: "sent" })
    } else {
      // Mark as failed
      const errorMessage = result.error || "Unknown error"

      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          status: "failed",
          error_message: errorMessage,
          provider_response: result.providerResponse ?? {},
        })
        .eq("id", notification.id)

      if (updateError) {
        console.error(`Failed to update notification ${notification.id}:`, updateError)
      }

      failed += 1
      results.push({ id: notification.id, status: "failed", error: errorMessage })
    }
  }

  // Log summary
  console.log(JSON.stringify({
    event: "NOTIFICATION_BATCH_COMPLETE",
    total: notifications.length,
    sent,
    failed,
    dry_run: !resendApiKey,
  }))

  return jsonResponse(200, {
    success: true,
    processed: notifications.length,
    sent,
    failed,
    dry_run: !resendApiKey,
    results,
  })
})