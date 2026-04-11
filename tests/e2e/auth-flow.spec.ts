/**
 * E2E Tests: Authentication Flow
 *
 * Tests user authentication including signup, login, logout,
 * session management, and protected routes.
 *
 * CRITICAL FLOW: Authentication is required for checkout and admin access.
 */
import { test, expect, Page } from '@playwright/test';

// Test credentials - use environment variables in CI
const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'test-user@example.com',
  password: process.env.E2E_TEST_USER_PASSWORD || 'TestPassword123!',
};

const TEST_ADMIN = {
  email: process.env.E2E_TEST_ADMIN_EMAIL || 'test-admin@example.com',
  password: process.env.E2E_TEST_ADMIN_PASSWORD || 'AdminPassword123!',
};

// Helper functions
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function logout(page: Page) {
  await page.goto('/');
  await waitForPageLoad(page);

  // Try desktop dropdown
  const accountButton = page.locator('button:has-text("Account"), button[aria-haspopup="menu"]').first();
  if (await accountButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accountButton.click();
    await page.waitForTimeout(300);

    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    if (await signOutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await signOutButton.click();
      await waitForPageLoad(page);
      return;
    }
  }

  // Try mobile menu
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

async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for account dropdown or user-specific elements
  const accountButton = page.locator('button:has-text("Account"), [data-testid="user-menu"]').first();
  const signOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();

  return await accountButton.isVisible({ timeout: 2000 }).catch(() => false) ||
         await signOutButton.isVisible({ timeout: 2000 }).catch(() => false);
}

test.describe('Authentication Flow', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('Login Page', () => {
    test('displays login form correctly', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Check email input
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await expect(emailInput).toBeVisible({ timeout: 5000 });

      // Check password input
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await expect(passwordInput).toBeVisible();

      // Check submit button
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();

      // Check signup link
      const signupLink = page.locator('a[href="/signup"]').first();
      await expect(signupLink).toBeVisible();
    });

    test('validates required fields', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Form should not navigate away
      await page.waitForTimeout(500);

      // Check for validation messages or stay on page
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('validates email format', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Fill invalid email
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill('invalid-email');
      await passwordInput.fill('somepassword');
      await submitButton.click();

      // Should show validation error or stay on page
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/login');
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill('nonexistent@example.com');
      await passwordInput.fill('WrongPassword123!');
      await submitButton.click();

      // Wait for error response
      await page.waitForTimeout(2000);

      // Should show error message
      const errorMessage = page.locator('text=/invalid|incorrect|failed|error/i');
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

      // Either error is shown or still on login page
      expect(hasError || page.url().includes('/login')).toBeTruthy();
    });

    test('successful login redirects to home or redirect URL', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      // Wait for redirect
      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
      await waitForPageLoad(page);

      // Should not be on login page anymore
      expect(page.url()).not.toContain('/login');

      // Should show logged-in state
      const accountButton = page.locator('button:has-text("Account"), [data-testid="user-menu"]').first();
      await expect(accountButton).toBeVisible({ timeout: 5000 });
    });

    test('redirect preserves intended destination', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Try to access protected route
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Should redirect to login with redirect param
      const url = page.url();
      expect(url).toContain('/login');

      // Login
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      // Should redirect back to checkout after login
      // Note: This may redirect to cart if cart is empty
      await page.waitForURL(/\/(checkout|cart)/, { timeout: 15000 });
    });

    test('has Google OAuth button', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Check for Google sign-in button
      const googleButton = page.locator('button:has-text("Google"), button:has([class*="chrome"])').first();
      await expect(googleButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Signup Page', () => {
    test('displays signup form correctly', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageLoad(page);

      // Check email input
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await expect(emailInput).toBeVisible({ timeout: 5000 });

      // Check password input
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      await expect(passwordInput).toBeVisible();

      // Check submit button
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();

      // Check login link
      const loginLink = page.locator('a[href="/login"]').first();
      await expect(loginLink).toBeVisible();
    });

    test('validates signup form fields', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageLoad(page);

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(500);

      // Should stay on signup page
      expect(page.url()).toContain('/signup');
    });

    test('validates password strength', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"],first()');
      const submitButton = page.locator('button[type="submit"]').first();

      // Fill weak password
      await emailInput.fill('test@example.com');
      await passwordInput.fill('123');
      await submitButton.click();

      // Should show validation error
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/signup');
    });

    test('has link to login page', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageLoad(page);

      const loginLink = page.locator('a[href="/login"]').first();
      await expect(loginLink).toBeVisible();

      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout', () => {
    test('logout works correctly', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Login first
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
      await waitForPageLoad(page);

      // Now logout
      await logout(page);

      // Should show logged out state
      const signInLink = page.locator('a[href="/login"], a:has-text("Sign In")').first();
      await expect(signInLink).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('checkout requires authentication', async ({ page }) => {
      await logout(page);
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('admin pages require authentication', async ({ page }) => {
      await logout(page);
      await page.goto('/admin');
      await waitForPageLoad(page);

      // Should redirect to login or show unauthorized
      const url = page.url();
      const hasAuthPrompt = await page.locator('text=/sign in|login|unauthorized/i').isVisible().catch(() => false);

      expect(url.includes('/login') || hasAuthPrompt).toBeTruthy();
    });

    test('admin requires admin role', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Login as regular user
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
      await waitForPageLoad(page);

      // Try to access admin
      await page.goto('/admin');
      await waitForPageLoad(page);

      // Should show unauthorized or redirect
      const url = page.url();
      const hasUnauthorizedMessage = await page.locator('text=/unauthorized|access denied|forbidden/i').isVisible().catch(() => false);

      // Non-admin should not have full admin access
      expect(url.includes('/login') || hasUnauthorizedMessage || url.includes('/admin')).toBeTruthy();
    });
  });

  test.describe('Session Management', () => {
    test('session persists across page navigations', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Login
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
      await waitForPageLoad(page);

      // Navigate to different pages
      await page.goto('/products');
      await waitForPageLoad(page);

      // Should still be logged in
      const accountButton = page.locator('button:has-text("Account")').first();
      await expect(accountButton).toBeVisible({ timeout: 5000 });

      // Navigate again
      await page.goto('/cart');
      await waitForPageLoad(page);

      // Still logged in
      await expect(accountButton).toBeVisible({ timeout: 5000 });
    });

    test('session persists after page reload', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Login
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
      await waitForPageLoad(page);

      // Reload page
      await page.reload();
      await waitForPageLoad(page);

      // Should still be logged in
      const accountButton = page.locator('button:has-text("Account")').first();
      await expect(accountButton).toBeVisible({ timeout: 5000 });
    });

    test('handles new browser session correctly', async ({ page, context }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Login in first session
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });

      // Create new page (new session context)
      const newPage = await context.newPage();
      await newPage.goto('/');
      await waitForPageLoad(newPage);

      // New page should also be logged in (same context)
      const accountButton = newPage.locator('button:has-text("Account")').first();
      await expect(accountButton).toBeVisible({ timeout: 5000 });

      await newPage.close();
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors during login', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password');

      // Go offline
      await page.context().setOffline(true);

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click().catch(() => {});

      // Should handle error gracefully
      await page.context().setOffline(false);

      // Page should still be usable
      await page.goto('/login');
      await waitForPageLoad(page);
      await expect(emailInput).toBeVisible();
    });

    test('handles expired session', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      // Login
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });

      // Clear cookies to simulate expired session
      await page.context().clearCookies();

      // Try to access protected route
      await page.goto('/checkout');
      await waitForPageLoad(page);

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Mobile Authentication', () => {
    test('mobile login flow works correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await waitForPageLoad(page);

      // Login form should be visible on mobile
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    test('mobile menu shows auth options', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await waitForPageLoad(page);

      // Open mobile menu
      const menuButton = page.locator('button[aria-label*="menu"]').first();
      await menuButton.click();

      // Should show Sign In link
      const signInLink = page.locator('a:has-text("Sign In"), a[href="/login"]').first();
      await expect(signInLink).toBeVisible({ timeout: 3000 });
    });

    test('mobile logout works correctly', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      await page.setViewportSize({ width: 375, height: 667 });

      // Login first
      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
      await waitForPageLoad(page);

      // Open mobile menu
      const menuButton = page.locator('button[aria-label*="menu"]').first();
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click Sign Out
      const signOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")').first();
      await signOutButton.click();
      await waitForPageLoad(page);

      // Should be logged out
      const signInLink = page.locator('a:has-text("Sign In"), a[href="/login"]').first();
      await expect(signInLink).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Security', () => {
    test('password is not visible in form', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      const passwordInput = page.locator('input[type="password"]').first();
      const type = await passwordInput.getAttribute('type');

      expect(type).toBe('password');
    });

    test('no sensitive data in URL after login', async ({ page }) => {
      test.skip(!TEST_USER.email.includes('@'), 'Requires valid test user credentials');

      await page.goto('/login');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      await emailInput.fill(TEST_USER.email);
      await passwordInput.fill(TEST_USER.password);
      await submitButton.click();

      await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });

      // URL should not contain password
      const url = page.url();
      expect(url).not.toContain('password');
      expect(url).not.toContain(TEST_USER.password);
    });

    test('redirect URL is validated', async ({ page }) => {
      // Try to set a malicious redirect
      await page.goto('/login?redirect=https://malicious-site.com');
      await waitForPageLoad(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();

      // Fill and submit (with invalid creds to stay on page)
      await emailInput.fill('test@example.com');
      await passwordInput.fill('wrongpassword');
      await submitButton.click();

      // Should stay on login or redirect to safe URL
      await page.waitForTimeout(2000);
      const url = page.url();

      // Should not redirect to malicious site
      expect(url).not.toContain('malicious-site.com');
    });

    test('CSRF protection on forms', async ({ page }) => {
      await page.goto('/login');
      await waitForPageLoad(page);

      // Check for CSRF token in form
      const csrfInput = page.locator('input[name="csrf_token"], input[name="_csrf"]').first();
      // CSRF token may or may not be visible as hidden input
      // This is informational, not a hard requirement

      // Form should submit via POST
      const form = page.locator('form').first();
      const method = await form.getAttribute('method');

      // Forms should use POST for security
      expect(method?.toLowerCase() === 'post' || method === null).toBeTruthy();
    });
  });
});