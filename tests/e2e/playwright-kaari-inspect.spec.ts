import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.setTimeout(60000);

// Test report data
const report = {
  errors: [] as string[],
  warnings: [] as string[],
  criticals: [] as string[],
  info: [] as string[],
  scores: {} as Record<string, { score: number; critical: number; high: number; medium: number; low: number }>,
  screenshots: [] as string[],
  metrics: {} as Record<string, any>
};

function log(level: 'info' | 'warning' | 'error' | 'critical', message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  console.log(logEntry);
  if (level === 'critical') {
    report.criticals.push(message);
  } else if (level === 'error') {
    report.errors.push(message);
  } else if (level === 'warning') {
    report.warnings.push(message);
  } else {
    report.info.push(message);
  }
}

// ============ PHASE 1: HOMEPAGE INSPECTION ============
test.describe('Phase 1 - Homepage Inspection', () => {
  test('1.1 Navigation & Load', async ({ page, browserName }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Capture title
    const title = await page.title();
    log('info', `Page title: ${title}`);
    expect(title.toLowerCase()).toContain('kaari');

    // Screenshot desktop
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: 'playwright-screenshots/homepage-desktop.png', fullPage: true });
    report.screenshots.push('homepage-desktop.png');

    // Screenshot mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'playwright-screenshots/homepage-mobile.png', fullPage: true });
    report.screenshots.push('homepage-mobile.png');
  });

  test('1.2 Performance Metrics via CDP', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    const metrics = await client.send('Performance.getMetrics');
    const metricsMap = new Map(metrics.metrics.map((m: any) => [m.name, m.value]));

    const criticalMetrics = {
      ScriptDuration: metricsMap.get('ScriptDuration') || 0,
      LayoutDuration: metricsMap.get('LayoutDuration') || 0,
      RecalcStyleDuration: metricsMap.get('RecalcStyleDuration') || 0,
      TaskDuration: metricsMap.get('TaskDuration') || 0
    };

    report.metrics.performance = criticalMetrics;
    log('info', `Performance metrics: ${JSON.stringify(criticalMetrics)}`);

    // Flag if any metric > 100ms
    for (const [name, value] of Object.entries(criticalMetrics)) {
      if (value > 500) {
        log('error', `Performance FAIL: ${name} = ${value}ms (>500ms)`);
      } else if (value > 100) {
        log('warning', `Performance WARN: ${name} = ${value}ms (>100ms)`);
      }
    }
  });

  test('1.3 Billboard Slider', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Check for billboard slides
    const slides = await page.locator('[data-slide], .slide, [class*="billboard"] > div').count();
    log('info', `Found ${slides} billboard slides`);

    // Check each slide
    const slideElements = await page.locator('[class*="billboard"]').first().locator('> div').all();
    for (let i = 0; i < Math.min(slideElements.length, 3); i++) {
      const slide = slideElements[i];
      const hasLink = await slide.locator('a').count() > 0;
      const hasDivWithHref = await slide.locator('div[data-href]').count() > 0;

      if (hasDivWithHref && !hasLink) {
        log('critical', `Slide ${i + 1}: Uses div with data-href instead of <a> tag - accessibility issue`);
      }

      // Check heading hierarchy
      const h1Count = await slide.locator('h1').count();
      const h2Count = await slide.locator('h2').count();
      if (i === 0 && h1Count === 0) {
        log('warning', 'First slide missing h1 heading');
      }
    }
  });

  test('1.4 Category Strip', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Check category strip exists
    const categorySection = await page.locator('[class*="category"]').first();
    if (!categorySection) {
      log('error', 'Category strip not found');
      return;
    }

    // Check images in category strip
    const categoryImages = await categorySection.locator('img').all();
    let missingAltCount = 0;
    for (const img of categoryImages) {
      const alt = await img.getAttribute('alt');
      if (!alt || alt === '') {
        missingAltCount++;
      }
    }
    if (missingAltCount > 0) {
      log('warning', `${missingAltCount} category images missing alt attributes`);
    }
  });

  test('1.5 Console Errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        log('error', `Console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
      log('critical', `Page error: ${error.message}`);
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    await page.waitForTimeout(2000);
    expect(consoleErrors).toHaveLength(0);
  });

  test('1.6 Network Requests', async ({ page }) => {
    const failedRequests: string[] = [];
    const sandboxRequests: string[] = [];

    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
      }
      if (response.url().includes('sandbox.cashfree.com')) {
        sandboxRequests.push(response.url());
        log('critical', `Sandbox Cashfree request found: ${response.url()}`);
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    if (sandboxRequests.length > 0) {
      log('critical', `FOUND ${sandboxRequests.length} requests to sandbox.cashfree.com - production blocker!`);
    }

    if (failedRequests.length > 0) {
      log('warning', `Found ${failedRequests.length} failed network requests`);
    }
  });
});

// ============ PHASE 2: AUTHENTICATION ============
test.describe('Phase 2 - Authentication Flows', () => {
  test('2.1 Sign-in Page', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'playwright-screenshots/signin-page.png' });
    report.screenshots.push('signin-page.png');

    // Verify form fields
    const emailField = await page.locator('input[type="email"]').first();
    const passwordField = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button[type="submit"]').first();

    expect(emailField).toBeTruthy();
    expect(passwordField).toBeTruthy();
    expect(submitButton).toBeTruthy();

    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      log('warning', 'Sign-in submit button is initially disabled');
    }
  });

  test('2.3 Unauthenticated Redirect Guard', async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    // Try accessing protected routes
    const protectedRoutes = ['/checkout', '/cart'];

    for (const route of protectedRoutes) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForTimeout(2000);

      const url = page.url();
      if (!url.includes('/login') && !url.includes('/sign-in')) {
        log('critical', `Route ${route} is NOT protected - accessible without auth!`);
      }
    }

    // Check admin route
    await page.goto('http://localhost:3000/admin');
    await page.waitForTimeout(2000);
    const adminUrl = page.url();
    if (!adminUrl.includes('/login') && !adminUrl.includes('403')) {
      log('critical', 'Admin route NOT protected - security vulnerability!');
    }
  });
});

// ============ PHASE 3: PRODUCT CATALOG ============
test.describe('Phase 3 - Product Catalog', () => {
  test('3.1 Products Page', async ({ page }) => {
    await page.goto('http://localhost:3000/products');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'playwright-screenshots/products-page.png' });
    report.screenshots.push('products-page.png');

    // Verify product grid
    const productCards = await page.locator('[class*="product-card"], article, [data-product]').count();
    log('info', `Found ${productCards} product cards`);

    if (productCards === 0) {
      log('error', 'No product cards found on products page');
    }
  });

  test('3.2 Product Detail Page', async ({ page }) => {
    await page.goto('http://localhost:3000/products');
    await page.waitForLoadState('networkidle');

    // Click first product
    const firstProduct = await page.locator('[class*="product-card"]').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'playwright-screenshots/product-detail.png' });
      report.screenshots.push('product-detail.png');

      // Check for JSON-LD
      const jsonLd = await page.locator('script[type="application/ld+json"]').count();
      if (jsonLd === 0) {
        log('warning', 'Product detail page missing JSON-LD structured data');
      }

      // Check for OG meta tags
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      log('info', `OG URL: ${ogUrl}`);
    }
  });

  test('3.3 Image Rendering', async ({ page }) => {
    await page.goto('http://localhost:3000/products');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();
    let brokenImages = 0;
    let missingAlt = 0;
    let missingLazy = 0;

    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const loading = await img.getAttribute('loading');

      if (!alt || alt === '') {
        missingAlt++;
      }
      if (loading !== 'lazy') {
        missingLazy++;
      }

      // Check if image is broken
      const isVisible = await img.isVisible().catch(() => false);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth).catch(() => 0);

      if (!isVisible || naturalWidth === 0) {
        brokenImages++;
        log('error', `Broken image: ${src}`);
      }
    }

    log('info', `Images: ${images.length}, broken: ${brokenImages}, missing alt: ${missingAlt}, missing lazy: ${missingLazy}`);
  });
});

// ============ PHASE 4: CART FUNCTIONALITY ============
test.describe('Phase 4 - Cart Functionality', () => {
  test('4.1 Cart Page', async ({ page }) => {
    await page.goto('http://localhost:3000/cart');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'playwright-screenshots/cart-empty.png' });
    report.screenshots.push('cart-empty.png');

    // Check empty state
    const emptyState = await page.locator('text=/empty|no items|cart is empty/i').count();
    if (emptyState === 0) {
      log('warning', 'Cart page missing empty state message');
    }
  });
});

// ============ PHASE 5: CHECKOUT FLOW ============
test.describe('Phase 5 - Checkout Flow', () => {
  test('5.1 Checkout Page Structure', async ({ page }) => {
    // Navigate to checkout (will redirect to login if not authenticated)
    await page.goto('http://localhost:3000/checkout');
    await page.waitForTimeout(3000);

    const url = page.url();
    if (url.includes('/checkout')) {
      await page.screenshot({ path: 'playwright-screenshots/checkout-page.png' });
      report.screenshots.push('checkout-page.png');

      // Check for step progress indicator
      const stepIndicator = await page.locator('[class*="step"], [class*="progress"]').count();
      if (stepIndicator === 0) {
        log('warning', 'Checkout page missing step progress indicator');
      }
    }
  });
});

// ============ PHASE 10: LEGAL COMPLIANCE ============
test.describe('Phase 10 - Legal Compliance', () => {
  test('10.4 Legal Pages Required', async ({ page }) => {
    const requiredPages = [
      { path: '/terms-of-service', name: 'Terms of Service' },
      { path: '/privacy-policy', name: 'Privacy Policy' },
      { path: '/refund-policy', name: 'Refund Policy' },
      { path: '/shipping-policy', name: 'Shipping Policy' },
      { path: '/cancellation-policy', name: 'Cancellation Policy' }
    ];

    for (const pageInfo of requiredPages) {
      const response = await page.goto(`http://localhost:3000${pageInfo.path}`, { waitUntil: 'domcontentloaded' });
      if (response?.status() !== 200) {
        // Try alternative paths
        const altResponse = await page.goto(`http://localhost:3000${pageInfo.path.replace('-', '')}`, { waitUntil: 'domcontentloaded' });
        if (altResponse?.status() !== 200) {
          log('critical', `Missing legal page: ${pageInfo.name} (${pageInfo.path}) - Indian Consumer Protection Act 2019 violation`);
        }
      }
    }
  });
});

// ============ PHASE 11: SECURITY HEADERS ============
test.describe('Phase 11 - Security Headers', () => {
  test('11.1 Security Headers Check', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    const headers = response?.headers() || {};

    const requiredHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options'
    ];

    for (const header of requiredHeaders) {
      if (!headers[header]) {
        log('warning', `Missing security header: ${header}`);
      }
    }

    // Check CSP for unsafe-inline
    const csp = headers['content-security-policy'] || '';
    if (csp.includes("'unsafe-inline'")) {
      log('critical', 'CSP contains unsafe-inline - XSS vulnerability');
    }
  });
});

// Save report after all tests
test.afterAll(async () => {
  const reportPath = path.join(process.cwd(), 'playwright-inspection-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n\nReport saved to: ${reportPath}`);
});
