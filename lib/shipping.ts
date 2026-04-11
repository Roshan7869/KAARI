/**
 * Shipping configuration helpers.
 * Reads from the site_settings table so admin can change without redeploy.
 */

const SHIPPING_DEFAULT = { threshold: 999, enabled: true, base_cost: 79 };

type ShippingConfig = {
  threshold: number;
  enabled: boolean;
  base_cost: number;
};

/**
 * Fetch shipping config from the API.
 * Safe to call from client components.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const res = await fetch('/api/admin/settings', { next: { revalidate: 60 } });
    if (!res.ok) return SHIPPING_DEFAULT;
    const json = await res.json();
    return (json.data?.free_shipping as ShippingConfig) ?? SHIPPING_DEFAULT;
  } catch {
    return SHIPPING_DEFAULT;
  }
}

/**
 * Calculate shipping cost given a subtotal.
 * If config not provided, uses defaults.
 */
export function calculateShipping(subtotal: number, config: ShippingConfig = SHIPPING_DEFAULT): number {
  if (!config.enabled) return config.base_cost;
  return subtotal >= config.threshold ? 0 : config.base_cost;
}

/**
 * Get display text for shipping cost.
 * e.g. "Free" or "₹79"
 */
export function shippingDisplayText(subtotal: number, config: ShippingConfig = SHIPPING_DEFAULT): string {
  const cost = calculateShipping(subtotal, config);
  return cost === 0 ? 'Free' : `₹${cost}`;
}
