import { test, expect, Page } from '@playwright/test';

const CASHIER = { username: 'cashier', password: 'cashier123' };
const RIDER   = { username: 'rider',   password: 'rider123'   };

async function login(page: Page, c: { username: string; password: string }) {
  await page.goto('/login');
  await page.locator('input').first().fill(c.username);
  await page.locator('input[type="password"]').first().fill(c.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }).catch(() => undefined),
    page.locator('button[type="submit"]').first().click(),
  ]);
}

test.describe('non-admin role gating (C48 backend RBAC)', () => {
  test('cashier cannot reach /staff (admin/manager-only)', async ({ page }) => {
    await login(page, CASHIER);
    await page.goto('/staff', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    // Either we got redirected away, or the API returned a 403 surfaced in the UI.
    const url = page.url();
    if (url.endsWith('/staff')) {
      await expect(page.locator('body')).toContainText(/forbidden|insufficient permissions|disabled for your role|403/i);
    } else {
      expect(url).not.toContain('/staff');
    }
  });

  test('rider cannot reach /reports', async ({ page }) => {
    await login(page, RIDER);
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const url = page.url();
    if (url.endsWith('/reports')) {
      await expect(page.locator('body')).toContainText(/forbidden|insufficient permissions|disabled for your role|403/i);
    } else {
      expect(url).not.toContain('/reports');
    }
  });
});
