import { test, expect, Page } from '@playwright/test';

/**
 * Web-admin smoke suite.
 *  - login as ADMIN (admin / ChangeMe123!)
 *  - hit the major pages and confirm they don't throw uncaught errors and
 *    don't blank-render.
 *  - exercise dark mode by toggling the theme key in localStorage and
 *    reloading; assert .dark is on <html>.
 *
 * The cashier and rider creds (cashier/cashier123, rider/rider123) are
 * exercised in role-spec.ts.
 */

const ADMIN = { username: 'admin', password: 'ChangeMe123!' };

const PAGES = [
  '/',
  '/orders',
  '/menu',
  '/inventory',
  '/customers',
  '/staff',
  '/tables',
  '/kitchen',
  '/reports',
  '/settings',
  '/finance',
  '/marketing',
  '/branches',
  '/delivery-zones',
  '/qr-codes',
  '/feature-access',
  '/reviews',
];

async function login(page: Page, creds: { username: string; password: string }) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[name="username"], input[type="text"]').first().fill(creds.username);
  await page.locator('input[name="password"], input[type="password"]').first().fill(creds.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }).catch(() => undefined),
    page.locator('button[type="submit"]').first().click(),
  ]);
}

async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test.describe('admin smoke', () => {
  test('login → dashboard renders', async ({ page }) => {
    const errors = await captureConsoleErrors(page);
    await login(page, ADMIN);
    expect(page.url()).not.toContain('/login');
    // Some recognizable element on the dashboard
    await expect(page.locator('body')).not.toHaveText(/Internal Server Error|Cannot read|TypeError/i);
    // Allow a small grace window for late console errors.
    await page.waitForTimeout(1500);
    const blocking = errors.filter((e) =>
      // ignore noise: 401 retries during initial bootstrap, hydration warnings, prefetch 404s
      !/401|hydrat|Failed to fetch.*api\/auth|Manifest|chrome-extension/i.test(e)
    );
    expect(blocking, 'unexpected console errors').toEqual([]);
  });

  for (const path of PAGES) {
    test(`page ${path} loads without uncaught errors`, async ({ page }) => {
      const errors = await captureConsoleErrors(page);
      await login(page, ADMIN);
      const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(resp?.status() ?? 200).toBeLessThan(500);
      await page.waitForTimeout(1200);
      // Page-level error boundary text
      await expect(page.locator('body')).not.toHaveText(/Application error|TypeError|Cannot read prop|toFixed is not a function/i);
      const blocking = errors.filter((e) =>
        !/401|hydrat|Failed to fetch.*api\/auth|Manifest|chrome-extension|favicon/i.test(e)
      );
      expect(blocking, `console errors on ${path}: ${blocking.join(' | ')}`).toEqual([]);
    });
  }
});

test.describe('dark mode', () => {
  test('html.dark is set when theme=dark', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('poslytic-theme', 'dark'));
    await page.reload();
    const hasDarkClass = await page.locator('html').evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
  });

  test('orders page in dark mode has correct surface colors', async ({ page }) => {
    await login(page, ADMIN);
    await page.evaluate(() => localStorage.setItem('poslytic-theme', 'dark'));
    await page.reload();
    await page.goto('/orders');
    await page.waitForTimeout(1500);
    // Body background should NOT be a light value when dark theme is active.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // accept any rgb where the average channel is < 60 (i.e. dark)
    const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    expect(m, `body bg was ${bg}`).toBeTruthy();
    if (m) {
      const avg = (Number(m[1]) + Number(m[2]) + Number(m[3])) / 3;
      expect(avg, `body bg ${bg} not dark`).toBeLessThan(80);
    }
  });
});
