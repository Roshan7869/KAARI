import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger-server';
import { APP_URL } from '@/lib/metadata';
import { applyRateLimit } from '@/lib/server-rate-limit';
import { validateCsrfToken } from '@/lib/csrf-server';

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  message: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request, 'api', true);
  if (rateLimitResponse) return rateLimitResponse;

  const csrfValid = await validateCsrfToken(request);
  if (!csrfValid) {
    return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = ContactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      );
    }

    const { name, email, message } = result.data;

    // Forward to WhatsApp or email — for now, log and redirect
    logger.info('Contact form submission', { name, email, messageLength: message.length });

    // Redirect back to contact page with success
    return NextResponse.json({ success: true, message: 'Thank you for your message! We will get back to you soon.' });
  } catch (error) {
    const err = error as Error;
    logger.error('Contact form error', { message: err.message });
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}