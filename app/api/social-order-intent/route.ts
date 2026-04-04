import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { validateBody } from '@/lib/api-validate';
import { sanitizeTextInput } from '@/lib/sanitization';
import { z } from 'zod';

const SocialChannelEnum = z.enum(['instagram_dm', 'whatsapp', 'copy_link', 'native_share', 'card_share']);

const SocialOrderIntentSchema = z.object({
  eventType:    z.literal('social_order_intent'),
  channel:      SocialChannelEnum,
  productSlug:  z.string().min(1),
  productTitle: z.string().min(1),
  productPrice: z.number(),  // Accept any number; normalize to max(0, price) below
  category:     z.string().nullable().optional(),
  sourcePage:   z.string().optional(),
  campaign:     z.string().optional(),
  timestamp:    z.string().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, SocialOrderIntentSchema);
  if ('error' in validation) return validation.error;

  const body = validation.data;

  const normalizedIntent = {
    event_type:    'social_order_intent',
    channel:       body.channel,
    product_slug:  sanitizeTextInput(body.productSlug, 120),
    product_title: sanitizeTextInput(body.productTitle, 180),
    product_price: Math.max(0, body.productPrice),
    category:      body.category ? sanitizeTextInput(body.category, 80) : null,
    source_page:   sanitizeTextInput(body.sourcePage ?? '/', 200),
    campaign:      body.campaign != null ? sanitizeTextInput(body.campaign, 80) : 'instagram-dm-orders',
    occurred_at:   body.timestamp ?? new Date().toISOString(),
    received_at:   new Date().toISOString(),
  };

  // Bridge-ready endpoint: logs and returns accepted.
  logger.info('SOCIAL_ORDER_INTENT', normalizedIntent);

  return NextResponse.json({ success: true }, { status: 202 });
}
