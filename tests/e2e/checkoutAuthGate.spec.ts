import { test, expect } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL

test.describe('checkout auth gate', () => {
  test.skip(!baseUrl, 'Set E2E_BASE_URL to run e2e auth-gate test')

  test('redirects anonymous users to login', async ({ page }) => {
    await page.goto(`${baseUrl}/checkout`)
    await expect(page).toHaveURL(/\/login/)
  })
})
