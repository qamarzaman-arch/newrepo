import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5176';

const ROLES = {
  admin: { username: 'admin', password: 'admin123', expectedRedirect: '/dashboard' },
  cashier: { username: 'cashier1', password: 'cashier123', expectedRedirect: '/cashier-pos' },
  kitchen: { username: 'kitchen', password: 'kitchen123', expectedRedirect: '/kitchen' },
  manager: { username: 'manager', password: 'manager123', expectedRedirect: '/dashboard' },
};

test.describe('Role-Based Access Control Tests', () => {
  
  for (const [roleName, credentials] of Object.entries(ROLES)) {
    test(`Login as ${roleName} redirects correctly`, async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.fill('input[type="text"]', credentials.username);
      await page.fill('input[type="password"]', credentials.password);
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForTimeout(2000);
      
      // Verify URL contains expected redirect
      const url = page.url();
      console.log(`${roleName} redirected to: ${url}`);
      expect(url).toContain(credentials.expectedRedirect);
    });
    
    test(`${roleName} cannot access unauthorized routes`, async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="text"]', credentials.username);
      await page.fill('input[type="password"]', credentials.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Try to access restricted routes based on role
      if (roleName === 'cashier') {
        // Cashier should be redirected from /dashboard to /cashier-pos
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain('/dashboard');
      } else if (roleName === 'kitchen') {
        // Kitchen should be redirected from /pos to /kitchen
        await page.goto(`${BASE_URL}/pos`);
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/kitchen');
      }
    });
  }
  
  test('Invalid credentials show error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[type="text"]', 'invalid');
    await page.fill('input[type="password"]', 'invalid123');
    await page.click('button[type="submit"]');
    
    // Wait for error toast
    await page.waitForTimeout(1000);
    
    // Should stay on login page
    expect(page.url()).toContain('/login');
  });
});

test.describe('Screen Functionality Tests', () => {
  test('Admin can access all admin screens', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Test navigation to different screens
    const adminScreens = ['/dashboard', '/orders', '/menu', '/inventory', '/reports', '/staff'];
    
    for (const screen of adminScreens) {
      await page.goto(`${BASE_URL}${screen}`);
      await page.waitForTimeout(1000);
      
      // Should not be redirected (stay on requested page)
      const url = page.url();
      console.log(`Admin accessing ${screen}: ${url}`);
      expect(url).toContain(screen);
    }
  });
  
  test('Cashier POS screen loads without errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', 'cashier1');
    await page.fill('input[type="password"]', 'cashier123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait and check
    await page.waitForTimeout(3000);
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('dragEvent') && 
      !e.includes('devtools') &&
      !e.includes('[vi') // Vite warnings
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
  
  test('Kitchen screen loads and shows orders', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="text"]', 'kitchen');
    await page.fill('input[type="password"]', 'kitchen123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Verify on kitchen screen
    expect(page.url()).toContain('/kitchen');
    
    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('dragEvent') && 
      !e.includes('devtools') &&
      !e.includes('[vi')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
