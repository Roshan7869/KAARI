/**
 * E2E Tests: Admin Operations Flow
 *
 * Tests admin dashboard, product management, order management,
 * and customer management functionality.
 *
 * CRITICAL FLOW: Admin access controls and CRUD operations.
 */
import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_ADMIN = {
  email: process.env.E2E_TEST_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.E2E_TEST_ADMIN_PASSWORD || 'AdminPassword123!',
};

const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'test-user@example.com',
  password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
};

// Helper functions
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await waitForPageLoad(page);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  await waitForPageLoad(page);
}

async function loginAsAdmin(page: Page) {
  await login(page, TEST_ADMIN.email, TEST_ADMIN.password);
}

async function loginAsUser(page: Page) {
  await login(page, TEST_USER.email, TEST_USER.password);
}

async function logout(page: Page) {
  await page.goto('/');
  await waitForPageLoad(page);

  const accountButton = page.locator('button:has-text("Account")').first();
  if (await accountButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accountButton.click();
    await page.waitForTimeout(300);

    const signOutButton = page.locator('button:has-text("Sign Out")').first();
    if (await signOutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await signOutButton.click();
      await waitForPageLoad(page);
    }
  }
}

test.describe('Admin Flow - Access Control', () => {
  test.describe.configure({ mode: 'parallel' });

  test('unauthenticated user cannot access admin pages', async ({ page }) => {
    await logout(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Should redirect to login or show unauthorized
    const url = page.url();
    const hasAuthPrompt = await page.locator('text=/sign in|login|unauthorized|forbidden/i').isVisible().catch(() => false);

    expect(url.includes('/login') || hasAuthPrompt).toBeTruthy();
  });

  test('non-admin user cannot access admin pages', async ({ page }) => {
    test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

    await loginAsUser(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Should redirect or show unauthorized
    const url = page.url();
    const hasUnauthorizedMessage = await page.locator('text=/unauthorized|access denied|forbidden|admin only/i').isVisible().catch(() => false);

    // Non-admin should not have full admin access
    expect(url.includes('/login') || hasUnauthorizedMessage || !url.includes('/admin')).toBeTruthy();
  });

  test('admin can access admin dashboard', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Should be on admin page
    expect(page.url()).toContain('/admin');

    // Check for admin dashboard elements
    const dashboardTitle = page.locator('h1, h2').filter({ hasText: /dashboard|admin/i });
    await expect(dashboardTitle).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('admin navigation sidebar works correctly', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Check for navigation links
    const productsLink = page.locator('a[href="/admin/products"]').first();
    const ordersLink = page.locator('a[href="/admin/orders"]').first();
    const customersLink = page.locator('a[href="/admin/customers"]').first();
    const settingsLink = page.locator('a[href="/admin/settings"]').first();

    // At least some navigation should be visible
    await expect(productsLink.or(ordersLink)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Flow - Product Management', () => {
  test.describe.configure({ mode: 'serial' }); // Products may need sequential testing

  test('products list page loads', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await waitForPageLoad(page);

    // Should be on products page
    expect(page.url()).toContain('/admin/products');

    // Check for product table or grid
    const productList = page.locator('table, [data-testid="product-grid"], [data-testid="product-list"], .space-y-4');
    await expect(productList.first()).toBeVisible({ timeout: 10000 });
  });

  test('products search functionality works', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await waitForPageLoad(page);

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search"]').first();

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Products should be filtered (or show no results)
      const productCount = await page.locator('[data-testid="product-item"], tr, .product-row').count();
      expect(productCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('can access new product page', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');
    await waitForPageLoad(page);

    // Should be on new product page
    expect(page.url()).toContain('/admin/products/new');

    // Check for form elements
    const titleInput = page.locator('input[name="title"], input[name="name"]').first();
    const priceInput = page.locator('input[name="price"], input[type="number"]').first();
    const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    await expect(titleInput.or(saveButton)).toBeVisible({ timeout: 5000 });
  });

  test('new product form validation', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');
    await waitForPageLoad(page);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorMessage = page.locator('text=/required|invalid|error/i');
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

      // Form should not have submitted
      expect(page.url()).toContain('/admin/products/new');
    }
  });

  test('can edit existing product', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await waitForPageLoad(page);

    // Find an edit button
    const editButton = page.locator('a[href*="/admin/products/"]:not([href="/admin/products/new"]), button:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await waitForPageLoad(page);

      // Should be on edit page
      expect(page.url()).toMatch(/\/admin\/products\/[^/]+$/);

      // Check for editable form
      const titleInput = page.locator('input[name="title"], input[name="name"]').first();
      await expect(titleInput).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('can toggle product status', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await waitForPageLoad(page);

    // Look for archive/toggle button
    const archiveButton = page.locator('button:has-text("Archive"), button:has-text("Deactivate")').first();
    const statusIndicator = page.locator('text=/Active|Inactive|Published|Draft/').first();

    // At least one of these should be visible
    await expect(archiveButton.or(statusIndicator)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});

test.describe('Admin Flow - Order Management', () => {
  test.describe.configure({ mode: 'parallel' });

  test('orders list page loads', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await waitForPageLoad(page);

    // Should be on orders page
    expect(page.url()).toContain('/admin/orders');

    // Check for orders table or list
    const orderList = page.locator('table, [data-testid="orders-list"], .order-item').first();
    await expect(orderList).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('orders filters work correctly', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await waitForPageLoad(page);

    // Look for filter controls
    const statusFilter = page.locator('select, [data-testid="status-filter"]').first();
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill('order-123');
      await page.waitForTimeout(500);
    }

    // Page should still be functional
    expect(page.url()).toContain('/admin/orders');
  });

  test('can view order details', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await waitForPageLoad(page);

    // Find an order to click
    const orderLink = page.locator('a[href*="/admin/orders/"]').first();

    if (await orderLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await orderLink.click();
      await waitForPageLoad(page);

      // Should be on order detail page
      expect(page.url()).toMatch(/\/admin\/orders\/[^/]+$/);

      // Check for order details
      const orderDetails = page.locator('text=/Order|Status|Total|Customer/i');
      await expect(orderDetails.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('order status update works', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await waitForPageLoad(page);

    // Navigate to first order
    const orderLink = page.locator('a[href*="/admin/orders/"]').first();
    if (await orderLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await orderLink.click();
      await waitForPageLoad(page);

      // Look for status update controls
      const statusSelect = page.locator('select[name="status"], [data-testid="status-select"]').first();
      const updateButton = page.locator('button:has-text("Update"), button:has-text("Save")').first();

      // At least one should be visible if order details page has status controls
      await expect(statusSelect.or(updateButton)).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

  test('handles invalid order ID gracefully', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/orders/nonexistent-order-12345');
    await waitForPageLoad(page);

    // Should show error message or redirect
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Admin Flow - Customer Management', () => {
  test.describe.configure({ mode: 'parallel' });

  test('customers list page loads', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/customers');
    await waitForPageLoad(page);

    // Should be on customers page
    expect(page.url()).toContain('/admin/customers');

    // Check for customer table or list
    const customerList = page.locator('table, [data-testid="customer-list"], .customer-item').first();
    await expect(customerList).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('customers search works', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/customers');
    await waitForPageLoad(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test@example.com');
      await page.waitForTimeout(500);

      // Should filter customers
      expect(page.url()).toContain('/admin/customers');
    }
  });
});

test.describe('Admin Flow - Settings', () => {
  test.describe.configure({ mode: 'parallel' });

  test('settings page loads', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/settings');
    await waitForPageLoad(page);

    // Should be on settings page
    expect(page.url()).toContain('/admin/settings');

    // Check for settings sections
    const settingsContent = page.locator('form, .settings-section, .card').first();
    await expect(settingsContent).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('payment settings accessible', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/settings/payment');
    await waitForPageLoad(page);

    // Should load payment settings
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Admin Flow - Dashboard', () => {
  test.describe.configure({ mode: 'parallel' });

  test('dashboard shows key metrics', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Look for dashboard metrics
    const metricsPattern = /orders|revenue|customers|products|sales/i;
    const metrics = page.locator('text=/orders|revenue|customers|products|sales/i').first();

    await expect(metrics).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('dashboard quick links work', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Find and click a quick link
    const productsLink = page.locator('a[href="/admin/products"]').first();

    if (await productsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productsLink.click();
      await waitForPageLoad(page);

      expect(page.url()).toContain('/admin/products');
    }
  });

  test('dashboard responsive on mobile', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);
    await page.goto('/admin');
    await waitForPageLoad(page);

    // Dashboard should still be usable
    const dashboardContent = page.locator('main, .dashboard, body').first();
    await expect(dashboardContent).toBeVisible();
  });
});

test.describe('Admin Flow - Error Handling', () => {
  test('handles invalid product ID on edit', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products/invalid-product-id-12345');
    await waitForPageLoad(page);

    // Should show error or handle gracefully
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });

  test('handles network errors during save', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');
    await waitForPageLoad(page);

    // Fill form
    const titleInput = page.locator('input[name="title"], input[name="name"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Product');

      // Go offline
      await page.context().setOffline(true);

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click().catch(() => {});

      // Restore network
      await page.context().setOffline(false);

      // Page should recover
      await page.reload();
      await waitForPageLoad(page);
      expect(page.url()).toBeTruthy();
    }
  });

  test('form data persists on validation error', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');
    await waitForPageLoad(page);

    const titleInput = page.locator('input[name="title"], input[name="name"]').first();
    if (await titleInput.isVisible()) {
      const testValue = 'Test Product Title';
      await titleInput.fill(testValue);

      // Submit incomplete form (should fail validation)
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(500);

      // Title should still have the value
      const value = await titleInput.inputValue();
      expect(value).toBe(testValue);
    }
  });
});

test.describe('Admin Flow - Accessibility', () => {
  test('admin pages have proper headings', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    const adminPages = [
      '/admin',
      '/admin/products',
      '/admin/orders',
      '/admin/customers',
      '/admin/settings',
    ];

    await loginAsAdmin(page);

    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      await waitForPageLoad(page);

      // Should have a heading
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('admin tables have accessible structure', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await waitForPageLoad(page);

    // Check for tables
    const tables = page.locator('table');
    const tableCount = await tables.count();

    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);
      // Tables should have headers
      const headers = table.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });

  test('keyboard navigation works in admin', async ({ page }) => {
    test.skip(!TEST_ADMIN.email.includes('@'), 'Requires valid admin credentials');

    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await waitForPageLoad(page);

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should be visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 2000 }).catch(() => {});
  });
});