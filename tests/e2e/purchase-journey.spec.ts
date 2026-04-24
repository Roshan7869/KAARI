import { test, expect } from '@playwright/test';

/**
 * E2E: Guest Purchase Journey
 * Covers product browsing → cart → checkout (redirects to login for auth)
 */

test.describe('Guest Purchase Journey', () => {
  test('browse products and view product detail', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/\/products/);

    // Wait for products to load
    const productCards = page.locator('[data-testid="product-card"], .product-card, article').first();
    await expect(productCards).toBeVisible({ timeout: 10000 });

    // Click first product
    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();
    await firstProduct.click();

    // Should navigate to product detail
    await expect(page).toHaveURL(/\/products\//);

    // Product detail should show price and add-to-cart
    await expect(page.locator('text=/₹/').first()).toBeVisible();
  });

  test('cart page shows empty state for guest', async ({ page }) => {
    await page.goto('/cart');

    // Wait for page to settle
    await page.waitForLoadState('networkidle');

    // Should show empty cart message or redirect to login
    const url = page.url();
    if (url.includes('/cart')) {
      const emptyText = page.locator('text=/empty|cart is empty|no items/i');
      await expect(emptyText.or(page.locator('h1, h2'))).toBeVisible();
    } else {
      // Clerk middleware redirects to login
      await expect(page).toHaveURL(/\/sign-in|\/login/);
    }
  });

  test('checkout redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toMatch(/\/sign-in|\/login/);
  });

  test('homepage loads with key elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify title contains Kaari
    await expect(page).toHaveTitle(/Kaari/i);

    // Verify navigation exists
    await expect(page.locator('nav, header').first()).toBeVisible();

    // Verify footer exists
    await expect(page.locator('footer').first()).toBeVisible();
  });
});

/**
 * E2E: Security Headers Verification
 */
test.describe('Security Headers', () => {
  test('homepage returns required security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};

    expect(headers['x-frame-options']?.toLowerCase()).toBe('sameorigin');
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
    expect(headers['strict-transport-security']).toBeTruthy();
  });

  test('API routes disable caching', async ({ page }) => {
    const response = await page.goto('/api/health');
    const headers = response?.headers() ?? {};
    const cacheControl = (headers['cache-control'] ?? '').toLowerCase();
    expect(cacheControl).toContain('no-cache');
  });
});
