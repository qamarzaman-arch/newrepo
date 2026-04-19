# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow-test.spec.ts >> Complete Order Flow Tests >> Admin can access and navigate all management screens
- Location: src\renderer\__tests__\full-flow-test.spec.ts:227:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 9
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - link "POSLytic POSLytic Smart Management" [ref=e6] [cursor=pointer]:
      - /url: /dashboard
      - img "POSLytic" [ref=e8]
      - generic [ref=e9]:
        - heading "POSLytic" [level=1] [ref=e10]
        - paragraph [ref=e11]: Smart Management
    - generic [ref=e12]:
      - paragraph [ref=e13]: Hello, Admin User!
      - paragraph [ref=e14]: "Role: ADMIN"
    - navigation [ref=e15]:
      - link "Dashboard" [ref=e17] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e19]
        - generic [ref=e24]: Dashboard
      - link "Orders" [ref=e26] [cursor=pointer]:
        - /url: /orders
        - img [ref=e28]
        - generic [ref=e32]: Orders
      - link "Kitchen Display" [ref=e34] [cursor=pointer]:
        - /url: /kitchen
        - img [ref=e36]
        - generic [ref=e38]: Kitchen Display
      - link "Tables & Reservations" [ref=e40] [cursor=pointer]:
        - /url: /tables
        - img [ref=e42]
        - generic [ref=e44]: Tables & Reservations
      - link "Menu Management" [ref=e46] [cursor=pointer]:
        - /url: /menu
        - img [ref=e48]
        - generic [ref=e52]: Menu Management
      - link "Inventory Control" [ref=e54] [cursor=pointer]:
        - /url: /inventory
        - img [ref=e56]
        - generic [ref=e60]: Inventory Control
      - link "Customer CRM" [ref=e62] [cursor=pointer]:
        - /url: /customers
        - img [ref=e64]
        - generic [ref=e69]: Customer CRM
      - link "Staff Management" [ref=e71] [cursor=pointer]:
        - /url: /staff
        - img [ref=e73]
        - generic [ref=e75]: Staff Management
      - link "Vendor Management" [ref=e77] [cursor=pointer]:
        - /url: /vendors
        - img [ref=e79]
        - generic [ref=e81]: Vendor Management
      - link "Financial Reports" [ref=e83] [cursor=pointer]:
        - /url: /reports
        - img [ref=e85]
        - generic [ref=e87]: Financial Reports
      - link "Settings" [ref=e89] [cursor=pointer]:
        - /url: /settings
        - img [ref=e91]
        - generic [ref=e94]: Settings
    - button "Logout" [ref=e97] [cursor=pointer]:
      - img [ref=e99]
      - generic [ref=e102]: Logout
  - generic [ref=e103]:
    - banner [ref=e104]:
      - generic [ref=e105]:
        - generic [ref=e106]:
          - paragraph [ref=e107]: Workspace
          - heading "Settings" [level=2] [ref=e108]
        - generic [ref=e109]:
          - generic [ref=e110]:
            - img [ref=e111]
            - generic [ref=e115]: Online
          - generic [ref=e116]:
            - img [ref=e117]
            - generic [ref=e120]:
              - paragraph [ref=e121]: 01:47:40 PM
              - paragraph [ref=e122]: Apr 19, 2026
          - generic [ref=e123]:
            - img [ref=e124]
            - generic [ref=e127]:
              - paragraph [ref=e128]: Admin User
              - paragraph [ref=e129]: ADMIN
    - main [ref=e130]:
      - generic [ref=e132]:
        - generic [ref=e133]:
          - generic [ref=e134]:
            - heading "System Settings" [level=1] [ref=e135]:
              - img [ref=e136]
              - text: System Settings
            - paragraph [ref=e139]: Configure your POS system preferences and behavior
          - generic [ref=e140]:
            - button "Reset Defaults" [ref=e141] [cursor=pointer]:
              - img [ref=e142]
              - text: Reset Defaults
            - button "Save Changes" [ref=e145] [cursor=pointer]:
              - img [ref=e146]
              - text: Save Changes
        - generic [ref=e150]:
          - generic [ref=e152]:
            - button "General" [ref=e153] [cursor=pointer]:
              - img [ref=e154]
              - text: General
            - button "Business Rules" [ref=e159] [cursor=pointer]:
              - img [ref=e160]
              - text: Business Rules
            - button "Payment Methods" [ref=e162] [cursor=pointer]:
              - img [ref=e163]
              - text: Payment Methods
            - button "Hardware & Devices" [ref=e165] [cursor=pointer]:
              - img [ref=e166]
              - text: Hardware & Devices
            - button "Notifications" [ref=e170] [cursor=pointer]:
              - img [ref=e171]
              - text: Notifications
            - button "Security" [ref=e174] [cursor=pointer]:
              - img [ref=e175]
              - text: Security
            - button "Appearance" [ref=e177] [cursor=pointer]:
              - img [ref=e178]
              - text: Appearance
          - generic [ref=e186]:
            - generic [ref=e187]:
              - heading "Restaurant Information" [level=3] [ref=e188]
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - generic [ref=e191]: Restaurant Name
                  - textbox [ref=e192]: POSLytic Restaurant
                - generic [ref=e193]:
                  - generic [ref=e194]: Tagline
                  - textbox [ref=e195]: Smart restaurant operations made simple
            - generic [ref=e196]:
              - heading "Regional Settings" [level=3] [ref=e197]
              - generic [ref=e198]:
                - generic [ref=e199]:
                  - generic [ref=e200]: Timezone
                  - combobox [ref=e201]:
                    - option "Eastern Time (ET)" [selected]
                    - option "Central Time (CT)"
                    - option "Mountain Time (MT)"
                    - option "Pacific Time (PT)"
                - generic [ref=e202]:
                  - generic [ref=e203]: Language
                  - combobox [ref=e204]:
                    - option "English" [selected]
                    - option "Spanish"
                    - option "French"
                    - option "German"
        - generic [ref=e206]:
          - img [ref=e208]
          - generic [ref=e210]:
            - heading "Settings Management Tip" [level=3] [ref=e211]
            - paragraph [ref=e212]: Changes to critical settings like tax rates and payment methods may require a system restart. Always test configuration changes in a safe environment before applying to production.
```

# Test source

```ts
  183 |     await page.waitForTimeout(3000);
  184 |     
  185 |     // Should be on cashier POS
  186 |     expect(page.url()).toContain('/cashier-pos');
  187 |     
  188 |     // Look for table selection or dine-in option
  189 |     const tableSection = page.locator('text=/Table|Dine|Seat/i, [data-testid="table"], .table-grid').first();
  190 |     const hasTables = await tableSection.isVisible({ timeout: 5000 }).catch(() => false);
  191 |     
  192 |     if (hasTables) {
  193 |       console.log('Table selection found - testing dine-in flow');
  194 |       
  195 |       // Try to select a table
  196 |       const availableTable = page.locator('.table-available, button:has-text("Table"), .table:enabled').first();
  197 |       try {
  198 |         await availableTable.click({ timeout: 3000 });
  199 |         console.log('Selected table');
  200 |       } catch (e) {
  201 |         console.log('Could not select table, proceeding without table');
  202 |       }
  203 |     } else {
  204 |       console.log('No table selection UI found - testing quick order flow');
  205 |     }
  206 |     
  207 |     // Add items to cart
  208 |     const menuItem = page.locator('button, .menu-item, [class*="item"]').first();
  209 |     await menuItem.click();
  210 |     await page.waitForTimeout(1000);
  211 |     
  212 |     // Try to place order
  213 |     const checkoutBtn = page.locator('button:has-text("Order"), button:has-text("Checkout"), button:has-text("Pay")').first();
  214 |     try {
  215 |       await checkoutBtn.click({ timeout: 5000 });
  216 |       console.log('Order placed successfully');
  217 |     } catch (e) {
  218 |       console.log('Could not complete order - cart might be empty or UI different');
  219 |     }
  220 |     
  221 |     await page.waitForTimeout(2000);
  222 |     await page.screenshot({ path: 'test-results/dine-in-order.png' });
  223 |     
  224 |     console.log('✅ Dine-in order test completed');
  225 |   });
  226 | 
  227 |   test('Admin can access and navigate all management screens', async ({ page }) => {
  228 |     const consoleErrors: string[] = [];
  229 |     page.on('console', msg => {
  230 |       if (msg.type() === 'error') {
  231 |         consoleErrors.push(msg.text());
  232 |       }
  233 |     });
  234 |     
  235 |     console.log('Testing admin screen access...');
  236 |     
  237 |     // Login as admin
  238 |     await page.goto(`${BASE_URL}/login`);
  239 |     await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  240 |     await page.fill('input[type="text"]', 'admin');
  241 |     await page.fill('input[type="password"]', 'admin123');
  242 |     await page.click('button[type="submit"]');
  243 |     await page.waitForTimeout(3000);
  244 |     
  245 |     expect(page.url()).toContain('/dashboard');
  246 |     
  247 |     // Test all admin screens
  248 |     const screens = [
  249 |       { path: '/dashboard', name: 'Dashboard' },
  250 |       { path: '/orders', name: 'Orders' },
  251 |       { path: '/menu', name: 'Menu' },
  252 |       { path: '/inventory', name: 'Inventory' },
  253 |       { path: '/reports', name: 'Reports' },
  254 |       { path: '/staff', name: 'Staff' },
  255 |       { path: '/customers', name: 'Customers' },
  256 |       { path: '/tables', name: 'Tables' },
  257 |       { path: '/settings', name: 'Settings' },
  258 |     ];
  259 |     
  260 |     for (const screen of screens) {
  261 |       console.log(`Testing ${screen.name} screen...`);
  262 |       await page.goto(`${BASE_URL}${screen.path}`);
  263 |       await page.waitForTimeout(2000);
  264 |       
  265 |       const url = page.url();
  266 |       console.log(`  ${screen.name} URL: ${url}`);
  267 |       
  268 |       // Should not redirect to login (meaning access is allowed)
  269 |       expect(url).not.toContain('/login');
  270 |       
  271 |       // Take screenshot
  272 |       await page.screenshot({ path: `test-results/admin-${screen.name.toLowerCase()}.png` });
  273 |     }
  274 |     
  275 |     // Filter critical errors
  276 |     const criticalErrors = consoleErrors.filter(e => 
  277 |       !e.includes('dragEvent') && 
  278 |       !e.includes('devtools') &&
  279 |       !e.includes('[vi') &&
  280 |       !e.includes('Source map')
  281 |     );
  282 |     
> 283 |     expect(criticalErrors.length).toBe(0);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  284 |     
  285 |     console.log('✅ Admin screen navigation test completed');
  286 |   });
  287 | 
  288 |   test('Kitchen staff can view and manage orders', async ({ page }) => {
  289 |     console.log('Testing kitchen order management...');
  290 |     
  291 |     // Login as kitchen
  292 |     await page.goto(`${BASE_URL}/login`);
  293 |     await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  294 |     await page.fill('input[type="text"]', 'kitchen');
  295 |     await page.fill('input[type="password"]', 'kitchen123');
  296 |     await page.click('button[type="submit"]');
  297 |     await page.waitForTimeout(3000);
  298 |     
  299 |     // Should be on kitchen screen
  300 |     const url = page.url();
  301 |     console.log(`Kitchen URL: ${url}`);
  302 |     expect(url).toContain('/kitchen');
  303 |     
  304 |     // Wait for orders to load
  305 |     await page.waitForTimeout(3000);
  306 |     
  307 |     // Look for order management UI elements
  308 |     const orderCards = await page.locator('.order-card, .ticket, .kitchen-item').count();
  309 |     console.log(`Found ${orderCards} order elements on kitchen screen`);
  310 |     
  311 |     // Look for action buttons (if orders exist)
  312 |     const actionButtons = await page.locator('button:has-text("Ready"), button:has-text("Complete"), button:has-text("Start")').count();
  313 |     console.log(`Found ${actionButtons} action buttons`);
  314 |     
  315 |     await page.screenshot({ path: 'test-results/kitchen-screen.png' });
  316 |     
  317 |     console.log('✅ Kitchen screen test completed');
  318 |   });
  319 | 
  320 |   test('Cashier can view order history', async ({ page }) => {
  321 |     console.log('Testing cashier order history...');
  322 |     
  323 |     // Login as cashier
  324 |     await page.goto(`${BASE_URL}/login`);
  325 |     await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  326 |     await page.fill('input[type="text"]', 'cashier1');
  327 |     await page.fill('input[type="password"]', 'cashier123');
  328 |     await page.click('button[type="submit"]');
  329 |     await page.waitForTimeout(3000);
  330 |     
  331 |     // Navigate to cashier order history
  332 |     await page.goto(`${BASE_URL}/cashier-history`);
  333 |     await page.waitForTimeout(3000);
  334 |     
  335 |     const url = page.url();
  336 |     console.log(`Cashier history URL: ${url}`);
  337 |     
  338 |     // Look for order history elements
  339 |     const historyElements = await page.locator('table, .order-list, .history-item').count();
  340 |     console.log(`Found ${historyElements} history-related elements`);
  341 |     
  342 |     await page.screenshot({ path: 'test-results/cashier-history.png' });
  343 |     
  344 |     console.log('✅ Cashier order history test completed');
  345 |   });
  346 | });
  347 | 
```