/**
 * Guest Cart — localStorage-based cart for unauthenticated users.
 * Used when no Clerk user is available. On login, items are merged
 * into the server cart via POST /api/cart/merge.
 */

const GUEST_CART_KEY = 'kaari_guest_cart';

export interface GuestCartItem {
  productId: string;
  variantId?: string;
  title: string;
  image?: string;
  variantSize?: string;
  variantColor?: string;
  variantMaterial?: string;
  itemType: 'standard' | 'customized';
  quantity: number;
  unitPrice: number;
  customization?: {
    message: string;
    preferredSize?: string;
    preferredColor?: string;
    preferredMaterial?: string;
    deliveryDeadline?: string;
    budgetMin?: number;
    budgetMax?: number;
    quoteStatus: string;
    requiresManualReview: boolean;
  };
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__guest_cart_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function getGuestCart(): GuestCartItem[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestCartItem[];
  } catch {
    localStorage.removeItem(GUEST_CART_KEY);
    return [];
  }
}

export function saveGuestCart(items: GuestCartItem[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // Storage full — clear and retry
    localStorage.removeItem(GUEST_CART_KEY);
  }
}

export function addToGuestCart(item: GuestCartItem): GuestCartItem[] {
  const cart = getGuestCart();
  const existing = cart.find(
    (i) =>
      i.productId === item.productId &&
      i.variantId === item.variantId &&
      i.itemType === item.itemType
  );

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveGuestCart(cart);
  return cart;
}

export function updateGuestCartQuantity(
  productId: string,
  variantId: string | undefined,
  quantity: number
): GuestCartItem[] {
  const cart = getGuestCart();
  const item = cart.find(
    (i) => i.productId === productId && i.variantId === variantId
  );
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  saveGuestCart(cart);
  return cart;
}

export function removeFromGuestCart(
  productId: string,
  variantId: string | undefined
): GuestCartItem[] {
  const cart = getGuestCart().filter(
    (i) => !(i.productId === productId && i.variantId === variantId)
  );
  saveGuestCart(cart);
  return cart;
}

export function clearGuestCart(): void {
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(GUEST_CART_KEY);
  }
}

/**
 * Merge guest cart items into the server cart after login.
 * Returns the number of items successfully merged.
 */
export async function mergeGuestCartToServer(): Promise<number> {
  const guestItems = getGuestCart();
  if (guestItems.length === 0) return 0;

  try {
    const res = await fetch('/api/cart/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: guestItems }),
    });

    if (!res.ok) {
      console.error('Failed to merge guest cart:', res.statusText);
      return 0;
    }

    const json = await res.json();
    const mergedCount = json.merged ?? 0;

    // Clear guest cart after successful merge
    clearGuestCart();
    return mergedCount;
  } catch (err) {
    console.error('Error merging guest cart:', err);
    return 0;
  }
}