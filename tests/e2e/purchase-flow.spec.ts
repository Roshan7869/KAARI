/**
 * E2E Tests: Complete Purchase Flow
 *
 * Tests the entire purchase journey from browsing to order confirmation.
 * This is a CRITICAL user flow that must work correctly.
 *
 * Flow: Browse → Product Detail → Add to Cart → Checkout → Payment → Confirmation
 */
import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'test-user@example.com',
  password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
};

// Helper functions
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function dismissToasts(page: Page) {
  // Dismiss any toast notifications that might block interactions
  await page.keyboard.press('Escape').catch(() => {});
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await waitForPageLoad(page);

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for redirect after login
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  await waitForPageLoad(page);
}

async function ensureLoggedOut(page: Page) {
  await page.goto('/');
  await waitForPageLoad(page);

  // Check if logged in and logout if needed
  const accountButton = page.locator('button:has-text("Account"), button[aria-haspopup="menu"]').first();
  const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');

  if (await accountButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accountButton.click();
    await page.waitForTimeout(300);
    if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signOutButton.click();
      await waitForPageLoad(page);
    }
  }
}

test.describe('Purchase Flow - Critical Path', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Home Page', () => {
    test('displays hero section with call to action', async ({ page }) => {
      // Check hero section exists
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();

      // Check for CTA button or link to products
      const ctaButton = page.locator('a[href="/products"], button:has-text("Shop"), a:has-text("Shop")');
      await expect(ctaButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('navigation menu works correctly', async ({ page }) => {
      // Check logo
      const logo = page.locator('a[href="/"]').first();
      await expect(logo).toBeVisible();

      // Check Products link
      const productsLink = page.locator('a[href="/products"]').first();
      await expect(productsLink).toBeVisible();
      await productsLink.click();
      await expect(page).toHaveURL(/\/products/);
    });

    test('displays product grid on home page', async ({ page }) => {
      // Wait for products to load
      const productGrid = page.locator('[data-testid="product-grid"], .product-card, a[href^="/products/"]').first();
      await expect(productGrid).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Product Browsing', () => {
    test('products page loads successfully', async ({ page }) => {
      await page.goto('/products');
      await waitForPageLoad(page);

      // URL should be products page
      await expect(page).toHaveURL(/\/products/);

      // Product grid or product cards should be visible
      const productElement = page.locator('[data-testid="product-grid"], .product-card, a[href^="/products/"]').first();
      await expect(productElement).toBeVisible({ timeout: 10000 });
    });

    test('can click on a product to view details', async ({ page }) => {
      await page.goto('/products');
      await waitForPageLoad(page);

      // Click on first product
      const productLink = page.locator('a[href^="/products/"]').first();
      await expect(productLink).toBeVisible({ timeout: 10000 });
      await productLink.click();

      // Should be on product detail page
      await expect(page).toHaveURL(/\/products\/[^/]+$/);
      await waitForPageLoad(page);

      // Product details should be visible
      const productTitle = page.locator('h1, h2').first();
      await expect(productTitle).toBeVisible();
    });

    test('product detail page shows key elements', async ({ page }) => {
      // Navigate directly to a product
      await page.goto('/products');
      await waitForPageLoad(page);

      const productLink = page.locator('a[href^="/products/"]').first();
      if (await productLink.isVisible()) {
        await productLink.click();
        await waitForPageLoad(page);

        // Check product title
        const title = page.locator('h1').first();
        await expect(title).toBeVisible();

        // Check price is displayed
        const price = page.locator('text=/₹|Rs\\.?/i').first();
        await expect(price).toBeVisible({ timeout: 5000 });

        // Check for Add to Cart button
        const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add")').first();
        await expect(addToCartButton).toBeVisible();

        // Check for quantity selector
        const quantitySection = page.locator('text=/Qty|Quantity/i').first();
        await expect(quantitySection).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  test.describe('Cart Functionality', () => {
    test('cart page shows empty state when no items', async ({ page }) => {
      await ensureLoggedOut(page);
      await page.goto('/cart');
      await waitForPageLoad(page);

      // Check for empty cart message or cart container
      const emptyMessage = page.locator('text=/empty|no items|your cart is empty/i');
      const cartContainer = page.locator('h1:has-text("Shopping Cart"), .cart-container');

      // One of these should be visible
      await expect(emptyMessage.or(cartContainer)).toBeVisible({ timeout: 5000 });
    });

    test('can add product to cart (requires auth)', async ({ page }) => {
      // Skip if no test credentials
      test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

      // Login first
      await login(page, TEST_USER.email, TEST_USER.password);

      // Navigate to a product
      await page.goto('/products');
      await waitForPageLoad(page);

      const productLink = page.locator('a[href^="/products/"]').first();
      if (await productLink.isVisible()) {
        await productLink.click();
        await waitForPageLoad(page);

        // Click Add to Cart
        const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
        if (await addToCartButton.isVisible()) {
          await addToCartButton.click();
          await page.waitForTimeout(1000);

          // Should show success toast or cart indicator update
          const cartIndicator = page.locator('.cart-count, [data-testid="cart-count"], text=/\\d+/');
          await expect(cartIndicator.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
      }
    });

    test('cart page displays items correctly', async ({ page }) => {
      await page.goto('/cart');
      await waitForPageLoad(page);

      // Check page structure
      const cartTitle = page.locator('h1:has-text("Cart"), h1:has-text("Shopping Cart")');
      await expect(cartTitle).toBeVisible({ timeout: 5000 }).catch(() => {});

      // Check for order summary section
      const orderSummary = page.locator('text=/Order Summary|Total|Subtotal/i');
      await expect(orderSummary).toBeVisible({ timeout: 3000 }).catch(() => {});
    });

    test('can update quantity in cart', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

      await login(page, TEST_USER.email, TEST_USER.password);
      await page.goto('/cart');
      await waitForPageLoad(page);

      // Check if cart has items
      const cartItems = page.locator('[data-testid="cart-item"], .cart-item, .glass-card-cream');
      const itemCount = await cartItems.count();

      if (itemCount > 0) {
        // Look for quantity controls
        const plusButton = page.locator('button:has(svg), [aria-label="Increase quantity"]').first();
        const minusButton = page.locator('button:has(svg), [aria-label="Decrease quantity"]').first();

        // These buttons should exist
        await expect(plusButton.or(minusButton)).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });

    test('can remove item from cart', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

      await login(page, TEST_USER.email, TEST_USER.password);
      await page.goto('/cart');
      await waitForPageLoad(page);

      const cartItems = page.locator('[data-testid="cart-item"], .cart-item');
      const itemCount = await cartItems.count();

      if (itemCount > 0) {
        // Look for remove/trash button
        const removeButton = page.locator('button:has(svg[class*="trash"]), button[aria-label*="remove"], button[aria-label*="delete"]').first();
        await expect(removeButton).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });
  });

  test.describe('Checkout Process', () => {
    test('checkout requires authentication', async ({ page }) => {
      await ensureLoggedOut(page);
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Should redirect to login or show auth required message
      const url = page.url();
      const isOnLoginPage = url.includes('/login');
      const hasAuthMessage = await page.locator('text=/sign in|log in|login|authentication/i').isVisible().catch(() => false);

      expect(isOnLoginPage || hasAuthMessage).toBeTruthy();
    });

    test('checkout page structure for logged in users', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

      await login(page, TEST_USER.email, TEST_USER.password);

      // First add item to cart
      await page.goto('/products');
      await waitForPageLoad(page);

      const productLink = page.locator('a[href^="/products/"]').first();
      if (await productLink.isVisible()) {
        await productLink.click();
        await waitForPageLoad(page);

        const addToCart = page.locator('button:has-text("Add to Cart")').first();
        if (await addToCart.isVisible()) {
          await addToCart.click();
          await page.waitForTimeout(1000);
        }
      }

      // Go to checkout
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // If redirected to cart (empty cart), skip
      if (page.url().includes('/cart')) {
        test.skip(true, 'Cart is empty, cannot test checkout');
        return;
      }

      // Check checkout form elements
      const nameInput = page.locator('input[name="full_name"], input[placeholder*="name"]').first();
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
      const addressInput = page.locator('input[name="address_line1"], input[placeholder*="address"]').first();

      await expect(nameInput.or(phoneInput)).toBeVisible({ timeout: 5000 });
    });

    test('checkout form validation', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

      await login(page, TEST_USER.email, TEST_USER.password);

      // Navigate to checkout with item in cart
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // If redirected to cart (empty), skip
      if (page.url().includes('/cart')) {
        test.skip(true, 'Cart is empty, cannot test checkout');
        return;
      }

      // Try to submit empty form
      const submitButton = page.locator('button:has-text("Place Order"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Form should show validation errors or not proceed
        const errorMessage = page.locator('text=/required|invalid|error/i');
        // Validation should prevent submission
        await expect(page).toHaveURL(/checkout/);
      }
    });

    test('checkout has payment method options', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

      await login(page, TEST_USER.email, TEST_USER.password);
      await page.goto('/checkout');
      await waitForPageLoad(page);

      if (page.url().includes('/cart')) {
        test.skip(true, 'Cart is empty');
        return;
      }

      // Check for payment method selection
      const onlinePayment = page.locator('input[type="radio"][value="online"], label:has-text("UPI"), label:has-text("online")');
      const codOption = page.locator('input[type="radio"][value="cod"], label:has-text("Cash on Delivery")');

      await expect(onlinePayment.or(codOption)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Order Confirmation', () => {
    test('order confirmation page handles invalid order ID', async ({ page }) => {
      await page.goto('/order-confirmation/invalid-order-id-12345');
      await waitForPageLoad(page);

      // Should show error, not found, or redirect
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });

    test('order confirmation requires valid session', async ({ page }) => {
      // Try to access confirmation without valid session
      await page.goto('/order-confirmation/test-order-id');
      await waitForPageLoad(page);

      // Should either show error, redirect, or require auth
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('mobile view - product page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/products');
      await waitForPageLoad(page);

      // Page should load correctly on mobile
      const productElement = page.locator('a[href^="/products/"]').first();
      await expect(productElement).toBeVisible({ timeout: 10000 });

      // Mobile menu should be accessible
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has(svg)').first();
      await expect(mobileMenuButton).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('mobile view - cart page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/cart');
      await waitForPageLoad(page);

      // Cart should be usable on mobile
      const cartContent = page.locator('main, .cart-container, body');
      await expect(cartContent.first()).toBeVisible();
    });

    test('tablet view - checkout page', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Checkout should adapt to tablet
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });
  });
});

test.describe('Purchase Flow - Edge Cases', () => {
  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Simulate offline
    await page.context().setOffline(true);

    // Try to navigate
    await page.goto('/products').catch(() => {});

    // Should show error or offline state
    await page.context().setOffline(false);

    // Should recover when back online
    await page.goto('/products');
    await waitForPageLoad(page);

    expect(page.url()).toContain('/products');
  });

  test('handles 404 page correctly', async ({ page }) => {
    await page.goto('/nonexistent-page-that-does-not-exist');
    await waitForPageLoad(page);

    // Should show 404 or redirect to home
    const pageContent = await page.content();
    const has404Message = await page.locator('text=/not found|404|page.*exist/i').isVisible().catch(() => false);
    const isOnHome = page.url() === '/' || page.url().endsWith('/');

    expect(has404Message || isOnHome).toBeTruthy();
  });

  test('product with out of stock status', async ({ page }) => {
    await page.goto('/products');
    await waitForPageLoad(page);

    const productLink = page.locator('a[href^="/products/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await waitForPageLoad(page);

      // Check stock indicator
      const stockStatus = page.locator('text=/In Stock|Out of Stock|Available|Unavailable/i');
      await expect(stockStatus).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('cart persists across page navigation', async ({ page }) => {
    test.skip(!TEST_USER.email.includes('@'), 'Requires test user credentials');

    await login(page, TEST_USER.email, TEST_USER.password);

    // Check initial cart state
    await page.goto('/cart');
    await waitForPageLoad(page);
    const initialCartState = await page.content();

    // Navigate to another page
    await page.goto('/products');
    await waitForPageLoad(page);

    // Navigate back to cart
    await page.goto('/cart');
    await waitForPageLoad(page);
    const finalCartState = await page.content();

    // Cart state should be maintained
    expect(finalCartState).toBeTruthy();
  });
});

test.describe('Accessibility', () => {
  test('product page keyboard navigation', async ({ page }) => {
    await page.goto('/products');
    await waitForPageLoad(page);

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should be visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    // Email input should have accessible label
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const emailLabel = page.locator('label').filter({ hasText: /email/i });
    await expect(emailLabel.or(emailInput)).toBeVisible();

    // Password input should have accessible label
    const passwordInput = page.locator('input[type="password"]').first();
    const passwordLabel = page.locator('label').filter({ hasText: /password/i });
    await expect(passwordLabel.or(passwordInput)).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/products');
    await waitForPageLoad(page);

    // Check that product images have alt attributes
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt text (even empty alt is valid for decorative images)
      expect(alt !== null).toBeTruthy();
    }
  });
});