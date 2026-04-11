/**
 * E2E Test Utilities
 *
 * Common helper functions and fixtures for E2E tests.
 */
import { Page } from '@playwright/test';

// Test credentials from environment
export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'test-user@example.com',
  password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
};

export const TEST_ADMIN = {
  email: process.env.E2E_TEST_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.E2E_TEST_ADMIN_PASSWORD || 'AdminPassword123!',
};

// Wait for page to fully load
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

// Login helper
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await waitForPageLoad(page);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  // Wait for redirect after login
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  await waitForPageLoad(page);
}

// Logout helper
export async function logout(page: Page) {
  await page.goto('/');
  await waitForPageLoad(page);

  // Desktop: click Account button, then Sign Out
  const accountButton = page.locator('button:has-text("Account"), button[aria-haspopup="menu"]').first();
  if (await accountButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accountButton.click();
    await page.waitForTimeout(300);

    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")').first();
    if (await signOutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await signOutButton.click();
      await waitForPageLoad(page);
      return;
    }
  }

  // Mobile: open menu, then click Sign Out
  const mobileMenuButton = page.locator('button[aria-label*="menu"]').first();
  if (await mobileMenuButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await mobileMenuButton.click();
    await page.waitForTimeout(300);

    const mobileSignOut = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
    if (await mobileSignOut.isVisible({ timeout: 1000 }).catch(() => false)) {
      await mobileSignOut.click();
      await waitForPageLoad(page);
    }
  }
}

// Check if user is logged in
export async function isLoggedIn(page: Page): Promise<boolean> {
  const accountButton = page.locator('button:has-text("Account")').first();
  const signOutButton = page.locator('button:has-text("Sign Out")').first();

  return await accountButton.isVisible({ timeout: 2000 }).catch(() => false) ||
         await signOutButton.isVisible({ timeout: 2000 }).catch(() => false);
}

// Ensure logged out state
export async function ensureLoggedOut(page: Page) {
  if (await isLoggedIn(page)) {
    await logout(page);
  }
}

// Add item to cart (requires logged in user)
export async function addToCart(page: Page): Promise<boolean> {
  await page.goto('/products');
  await waitForPageLoad(page);

  const productLink = page.locator('a[href^="/products/"]').first();
  if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await productLink.click();
    await waitForPageLoad(page);

    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addToCartButton.click();
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

// Clear cart
export async function clearCart(page: Page) {
  await page.goto('/cart');
  await waitForPageLoad(page);

  const removeButtons = page.locator('button[aria-label*="remove"], button[aria-label*="delete"]');
  const count = await removeButtons.count();

  for (let i = 0; i < count; i++) {
    const button = removeButtons.first();
    if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
      await button.click();
      await page.waitForTimeout(300);
    }
  }
}

// Generate random test data
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    phone: '9876543210',
    address: {
      line1: `${timestamp} Test Street`,
      line2: 'Apt 1',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
    },
  };
}

// Wait for toast notification
export async function waitForToast(page: Page, timeout = 5000) {
  const toast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
  await toast.first().waitFor({ state: 'visible', timeout }).catch(() => {});
}

// Dismiss any open modals/toasts
export async function dismissModals(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// Take screenshot on failure (for debugging)
export async function captureFailure(page: Page, testName: string) {
  const screenshot = await page.screenshot({ fullPage: true });
  // In a real setup, you'd save this to a file or attach to test report
  return screenshot;
}

// Check for console errors
export async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

// Mock API response (for isolated testing)
export async function mockApiResponse(page: Page, url: string, response: unknown) {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

// Skip test if credentials not available
export function skipIfNoCredentials(): boolean {
  return !TEST_USER.email.includes('@');
}

// Mobile viewport helper
export async function setMobileViewport(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 });
}

// Tablet viewport helper
export async function setTabletViewport(page: Page) {
  await page.setViewportSize({ width: 768, height: 1024 });
}

// Desktop viewport helper
export async function setDesktopViewport(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
}