/**
 * Google Tag Manager Analytics Service
 * Production-ready GTM integration with Next.js
 */

declare global {
  interface Window {
    dataLayer?: Record<string, any>[];
    gtag?: Function;
  }
}

/**
 * Initialize GTM script injection
 * Call this in your app initialization or layout
 */
export function initGTM(measurementId: string): void {
  if (typeof window === 'undefined') return;

  // Initialize data layer
  window.dataLayer = window.dataLayer || [];

  // GTM window function
  function gtag(...args: any[]) {
    window.dataLayer?.push(arguments);
  }

  window.gtag = gtag;

  // Inject GTM script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  gtag('js', new Date());
  gtag('config', measurementId);

  console.log('✅ Google Tag Manager initialized:', measurementId);
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  eventData: Record<string, any> = {}
): void {
  if (typeof window === 'undefined') return;

  try {
    window.gtag?.('event', eventName, eventData);

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Event tracked:', { eventName, eventData });
    }
  } catch (error) {
    console.error('GTM tracking error:', error);
  }
}

/**
 * Track e-commerce purchase
 */
export function trackPurchase(
  transactionId: string,
  value: number,
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value,
    currency: 'INR',
    items,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('💳 Purchase tracked:', { transactionId, value, itemCount: items.length });
  }
}

/**
 * Track page view
 */
export function trackPageView(path: string, title: string): void {
  trackEvent('page_view', {
    page_path: path,
    page_title: title,
  });
}

/**
 * Set user properties
 */
export function setUserProperties(
  userId: string,
  properties: Record<string, any>
): void {
  try {
    window.gtag?.('config', 'GA_MEASUREMENT_ID', {
      'user_id': userId,
      ...properties,
    });
  } catch (error) {
    console.error('GTM user properties error:', error);
  }
}
