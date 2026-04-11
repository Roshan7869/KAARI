/**
 * Global E2E Test Setup
 *
 * This file contains global setup and teardown logic for E2E tests.
 */
import { test as setup } from '@playwright/test';
import path from 'path';

// Authentication state file
const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate as regular user', async ({ page }) => {
  // Skip authentication if no credentials
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;
  const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

  if (!testUserEmail || !testUserPassword) {
    setup.skip(true, 'No test user credentials provided');
    return;
  }

  // Login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(testUserEmail);
  await passwordInput.fill(testUserPassword);
  await submitButton.click();

  // Wait for redirect
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('authenticate as admin user', async ({ page }) => {
  // Skip authentication if no credentials
  const adminEmail = process.env.E2E_TEST_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_TEST_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    setup.skip(true, 'No admin credentials provided');
    return;
  }

  const authFile = path.join(__dirname, '../.auth/admin.json');

  // Login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(adminEmail);
  await passwordInput.fill(adminPassword);
  await submitButton.click();

  // Wait for redirect
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});