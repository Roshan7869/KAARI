import { test, expect } from '@playwright/test';

/**
 * E2E: Admin Journey
 * Verifies admin routes are protected and non-admins are redirected.
 */

test.describe('Admin Route Protection', () => {
  test('admin dashboard redirects anonymous users', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).not.toBe('http://localhost:3000/admin');
    expect(url).toMatch(/\/sign-in|\/login|403/);
  });

  test('admin products page redirects anonymous users', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).not.toContain('/admin/products');
  });

  test('admin API returns 403 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/admin/products');
    expect(response.status()).toBeOneOf([401, 403, 307, 308]);
  });

  test('health endpoint is publicly accessible', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
  });
});
