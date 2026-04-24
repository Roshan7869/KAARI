import { test, expect, Page, BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './playwright-screenshots';

// Collectors
let consoleErrors: string[] = [];
let pageErrors: string[] = [];
let failedRequests: { url: string; status: number }[] = [];
let allNetworkRequests: { url: string; status: number; method: string }[] = [];

function setupCollectors(page: Page) {
  consoleErrors = [];
  pageErrors = [];
  failedRequests = [];
  allNetworkRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleErrors.push(`[WARN] ${msg.text()}`);
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('response', res => {
    const url = res.url();
    const status = res.status();
    allNetworkRequests.push({ url, status, method: res.request().method() });
    if (status >= 400) failedRequests.push({ url, status });
  });
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: HOMEPAGE
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 1: Homepage Inspection', () => {
  test.beforeEach(({ page }) => setupCollectors(page));

  test('1.1 Navigation & Load', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).toContain('Kaari');

    // Desktop screenshot
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage-desktop.png`, fullPage: true });

    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/homepage-mobile.png`, fullPage: true });
  });

  test('1.3 Billboard Slider', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.setViewportSize({ width: 1280, height: 900 });

    // Check for slides
    const slides = page.locator('[data-slide], .slide, [class*="billboard"] > div, [class*="hero"] > div');
    const slideCount = await slides.count();
    console.log(`Billboard slides found: ${slideCount}`);

    // Check for div with data-href (FAIL if found)
    const divDataHref = page.locator('div[data-href]');
    const divDataHrefCount = await divDataHref.count();
    if (divDataHrefCount > 0) {
      console.log(`FAIL: Found ${divDataHrefCount} div elements with data-href instead of <a> tags`);
    }

    // Check CTA buttons
    const ctaButtons = page.locator('a[href] button, a[href]');
    console.log(`Interactive links found: ${await ctaButtons.count()}`);
  });

  test('1.5 Console Errors', async ({ page }) => {
    setupCollectors(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    console.log(`\n=== Console Errors (${consoleErrors.length}) ===`);
    consoleErrors.forEach(e => console.log(`  ERR: ${e}`));
    console.log(`\n=== Page Errors (${pageErrors.length}) ===`);
    pageErrors.forEach(e => console.log(`  PAGE_ERR: ${e}`));
  });

  test('1.6 Network Requests', async ({ page }) => {
    setupCollectors(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });

    console.log(`\n=== Failed Requests (${failedRequests.length}) ===`);
    failedRequests.forEach(r => console.log(`  ${r.status}: ${r.url}`));

    const cashfreeSandbox = allNetworkRequests.filter(r => r.url.includes('sandbox.cashfree.com'));
    if (cashfreeSandbox.length > 0) {
      console.log(`CRITICAL: Requests to sandbox.cashfree.com detected!`);
      cashfreeSandbox.forEach(r => console.log(`  ${r.method} ${r.url}`));
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 2: AUTHENTICATION
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 2: Authentication Flows', () => {
  test('2.1 Sign-In Page', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/signin-page.png`, fullPage: true });

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    console.log(`Email input found: ${await emailInput.count() > 0}`);
    console.log(`Password input found: ${await passwordInput.count() > 0}`);
  });

  test('2.2 Sign-Up Page', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/signup-page.png`, fullPage: true });
  });

  test('2.3 Unauthenticated Route Guards', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    setupCollectors(page);

    // Test /checkout redirect
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle', timeout: 60000 });
    const checkoutUrl = page.url();
    console.log(`/checkout redirected to: ${checkoutUrl}`);
    const isCheckoutProtected = checkoutUrl.includes('login') || checkoutUrl.includes('sign-in') || checkoutUrl.includes('signup');
    console.log(`/checkout is protected: ${isCheckoutProtected}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/checkout-unauth.png`, fullPage: true });

    // Test /admin redirect
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
    const adminUrl = page.url();
    console.log(`/admin redirected to: ${adminUrl}`);

    await context.close();
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 3: PRODUCT CATALOG
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 3: Product Catalog & Detail', () => {
  test('3.1 Products Page', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/products-page.png`, fullPage: true });

    const productCards = page.locator('[class*="product"], [class*="card"], article a[href*="/products/"]');
    console.log(`Product cards found: ${await productCards.count()}`);
  });

  test('3.2 Product Detail Page', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.setViewportSize({ width: 1280, height: 900 });

    // Click first product
    const firstProduct = page.locator('a[href*="/products/"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/product-detail.png`, fullPage: true });

      // Check JSON-LD
      const jsonLd = page.locator('script[type="application/ld+json"]');
      const jsonLdCount = await jsonLd.count();
      console.log(`JSON-LD scripts found: ${jsonLdCount}`);

      // Check OG meta
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      console.log(`og:url: ${ogUrl}`);
    } else {
      console.log('No product links found on products page');
    }
  });

  test('3.3 Image Rendering', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle', timeout: 60000 });

    const images = page.locator('img');
    const imageCount = await images.count();
    let brokenImages = 0;
    let imagesWithoutAlt = 0;
    let imagesWithoutLazy = 0;

    for (let i = 0; i < Math.min(imageCount, 20); i++) {
      const src = await images.nth(i).getAttribute('src');
      const alt = await images.nth(i).getAttribute('alt');
      const loading = await images.nth(i).getAttribute('loading');

      if (!alt) imagesWithoutAlt++;
      if (loading !== 'lazy' && i > 0) imagesWithoutLazy++;

      if (src && !src.startsWith('data:')) {
        const response = await page.request.get(src).catch(() => null);
        if (!response || !response.ok()) brokenImages++;
      }
    }

    console.log(`Total images checked: ${Math.min(imageCount, 20)}`);
    console.log(`Broken images: ${brokenImages}`);
    console.log(`Images without alt: ${imagesWithoutAlt}`);
    console.log(`Images without lazy loading: ${imagesWithoutLazy}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 4: CART
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 4: Cart Functionality', () => {
  test('4.1 Cart Page (Empty)', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cart-empty.png`, fullPage: true });

    const emptyMsg = page.locator('text=/empty|no items|nothing in cart/i');
    console.log(`Empty cart message found: ${await emptyMsg.count() > 0}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 5: CHECKOUT
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 5: Checkout Flow', () => {
  test('5.1 Checkout Page', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/checkout-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/checkout-mobile.png`, fullPage: true });
  });

  test('5.2 Form Fields', async ({ page }) => {
    setupCollectors(page);
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.setViewportSize({ width: 1280, height: 900 });

    const phoneInput = page.locator('input[type="tel"], input[inputmode="tel"], input[name*="phone"]');
    const emailInput = page.locator('input[type="email"]');
    const pincodeInput = page.locator('input[name*="pincode"], input[name*="zip"], input[inputmode="numeric"]');
    const addressInput = page.locator('textarea[name*="address"], input[name*="address"]');

    console.log(`Phone input found: ${await phoneInput.count() > 0}`);
    console.log(`Email input found: ${await emailInput.count() > 0}`);
    console.log(`Pincode input found: ${await pincodeInput.count() > 0}`);
    console.log(`Address input found: ${await addressInput.count() > 0}`);
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 8: PERFORMANCE (Lighthouse)
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 8: Performance', () => {
  test('8.1 Page Load Metrics', async ({ page }) => {
    setupCollectors(page);
    const start = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const loadTime = Date.now() - start;
    console.log(`Homepage load time: ${loadTime}ms`);
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 9: ACCESSIBILITY
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 9: Accessibility', () => {
  test('9.1 Axe Scan - Homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const results = await new AxeBuilder({ page }).analyze();

    console.log(`\n=== AXE Violations: ${results.violations.length} ===`);
    results.violations.forEach(v => {
      console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
      v.nodes.forEach(n => console.log(`    ${n.html.substring(0, 100)}`));
    });

    const criticalViolations = results.violations.filter(v => v.impact === 'critical');
    const seriousViolations = results.violations.filter(v => v.impact === 'serious');
    console.log(`\nCritical: ${criticalViolations.length}, Serious: ${seriousViolations.length}`);
  });

  test('9.1 Axe Scan - Products', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle', timeout: 60000 });
    const results = await new AxeBuilder({ page }).analyze();
    console.log(`\n=== AXE Violations (Products): ${results.violations.length} ===`);
    results.violations.forEach(v => {
      console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
    });
  });

  test('9.1 Axe Scan - Login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    const results = await new AxeBuilder({ page }).analyze();
    console.log(`\n=== AXE Violations (Login): ${results.violations.length} ===`);
    results.violations.forEach(v => {
      console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 10: SEO & LEGAL
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 10: SEO & Legal', () => {
  test('10.1 Meta Tags', async ({ page }) => {
    setupCollectors(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });

    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');

    console.log(`Title: ${title}`);
    console.log(`Description: ${description}`);
    console.log(`og:title: ${ogTitle}`);
    console.log(`og:description: ${ogDesc}`);
    console.log(`og:url: ${ogUrl}`);
    console.log(`og:image: ${ogImage}`);
  });

  test('10.2 Sitemap & Robots', async ({ page }) => {
    const sitemapResp = await page.request.get(`${BASE_URL}/sitemap.xml`);
    console.log(`Sitemap status: ${sitemapResp.status()}`);

    const robotsResp = await page.request.get(`${BASE_URL}/robots.txt`);
    console.log(`Robots.txt status: ${robotsResp.status()}`);
  });

  test('10.4 Legal Pages', async ({ page }) => {
    const legalPages = [
      '/terms-of-service', '/terms', '/privacy-policy', '/privacy',
      '/refund-policy', '/returns', '/shipping-policy', '/shipping',
      '/cancellation-policy', '/cancellation'
    ];

    for (const path of legalPages) {
      try {
        const resp = await page.request.get(`${BASE_URL}${path}`, { timeout: 10000 });
        if (resp.ok()) {
          console.log(`  ✅ ${path} - ${resp.status()}`);
        } else {
          console.log(`  ❌ ${path} - ${resp.status()}`);
        }
      } catch (e) {
        console.log(`  ❌ ${path} - error`);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PHASE 11: SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════
test.describe('Phase 11: Security Headers', () => {
  test('11.1 Security Headers Check', async ({ page }) => {
    const response = await page.request.get(BASE_URL);
    const headers = response.headers();

    const securityHeaders = {
      'content-security-policy': headers['content-security-policy'],
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'strict-transport-security': headers['strict-transport-security'],
      'referrer-policy': headers['referrer-policy'],
      'permissions-policy': headers['permissions-policy'],
    };

    console.log('\n=== Security Headers ===');
    Object.entries(securityHeaders).forEach(([key, value]) => {
      const status = value ? '✅' : '❌ MISSING';
      console.log(`${status} ${key}: ${value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : 'NOT SET'}`);
    });

    // Check CSP for unsafe-inline
    const csp = headers['content-security-policy'] || '';
    if (csp.includes("'unsafe-inline'")) {
      console.log('CRITICAL: CSP contains unsafe-inline in script-src');
    }
    if (csp.includes("'unsafe-eval'")) {
      console.log('CRITICAL: CSP contains unsafe-eval in script-src');
    }
  });
});