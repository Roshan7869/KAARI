import { trackEvent } from '@/lib/analytics';

export type SocialChannel = 'instagram_dm' | 'whatsapp' | 'copy_link' | 'native_share' | 'card_share';

export interface DmOrderIntentPayload {
  eventType: 'social_order_intent';
  channel: SocialChannel;
  productSlug: string;
  productTitle: string;
  productPrice: number;
  category?: string | null;
  sourcePage: string;
  campaign?: string;
  timestamp: string;
}

interface TrackedUrlInput {
  slug: string;
  source: string;
  medium: string;
  campaign: string;
}

export function buildTrackedProductUrl({ slug, source, medium, campaign }: TrackedUrlInput): string {
  if (typeof window === 'undefined') {
    return `https://kaari.in/products/${slug}?utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`;
  }

  const url = new URL(`/products/${slug}`, window.location.origin);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

export function createDmOrderIntentPayload(input: {
  channel: SocialChannel;
  productSlug: string;
  productTitle: string;
  productPrice: number;
  category?: string | null;
  campaign?: string;
}): DmOrderIntentPayload {
  return {
    eventType: 'social_order_intent',
    channel: input.channel,
    productSlug: input.productSlug,
    productTitle: input.productTitle,
    productPrice: input.productPrice,
    category: input.category ?? null,
    sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/',
    campaign: input.campaign ?? 'instagram-dm-orders',
    timestamp: new Date().toISOString(),
  };
}

export async function dispatchDmOrderIntent(payload: DmOrderIntentPayload): Promise<void> {
  // Analytics event first for attribution dashboards
  trackEvent('social_order_intent', {
    channel: payload.channel,
    product_slug: payload.productSlug,
    product_title: payload.productTitle,
    product_price: payload.productPrice,
    category: payload.category ?? undefined,
    campaign: payload.campaign ?? undefined,
    source_page: payload.sourcePage,
  });

  // Best effort bridge call for future DM automation systems.
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/social-order-intent', blob);
      return;
    }

    await fetch('/api/social-order-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // intentionally swallow; this is non-blocking attribution telemetry
  }
}
