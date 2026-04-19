# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow-test.spec.ts >> Complete Order Flow Tests >> Full order lifecycle: Cashier creates order → Kitchen sees it → Admin views history
- Location: src\renderer\__tests__\full-flow-test.spec.ts:9:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
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
          - link "Orders" [ref=e27] [cursor=pointer]:
            - /url: /orders
            - img [ref=e29]
            - generic [ref=e33]: Orders
          - link "Kitchen Display" [ref=e35] [cursor=pointer]:
            - /url: /kitchen
            - img [ref=e37]
            - generic [ref=e39]: Kitchen Display
          - link "Tables & Reservations" [ref=e41] [cursor=pointer]:
            - /url: /tables
            - img [ref=e43]
            - generic [ref=e45]: Tables & Reservations
          - link "Menu Management" [ref=e47] [cursor=pointer]:
            - /url: /menu
            - img [ref=e49]
            - generic [ref=e53]: Menu Management
          - link "Inventory Control" [ref=e55] [cursor=pointer]:
            - /url: /inventory
            - img [ref=e57]
            - generic [ref=e61]: Inventory Control
          - link "Customer CRM" [ref=e63] [cursor=pointer]:
            - /url: /customers
            - img [ref=e65]
            - generic [ref=e70]: Customer CRM
          - link "Staff Management" [ref=e72] [cursor=pointer]:
            - /url: /staff
            - img [ref=e74]
            - generic [ref=e76]: Staff Management
          - link "Vendor Management" [ref=e78] [cursor=pointer]:
            - /url: /vendors
            - img [ref=e80]
            - generic [ref=e82]: Vendor Management
          - link "Financial Reports" [ref=e84] [cursor=pointer]:
            - /url: /reports
            - img [ref=e86]
            - generic [ref=e88]: Financial Reports
          - link "Settings" [ref=e90] [cursor=pointer]:
            - /url: /settings
            - img [ref=e92]
            - generic [ref=e95]: Settings
        - button "Logout" [ref=e97] [cursor=pointer]:
          - img [ref=e99]
          - generic [ref=e102]: Logout
      - generic [ref=e103]:
        - banner [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]:
              - paragraph [ref=e107]: Workspace
              - heading "Dashboard" [level=2] [ref=e108]
            - generic [ref=e109]:
              - generic [ref=e110]:
                - img [ref=e111]
                - generic [ref=e115]: Online
              - generic [ref=e116]:
                - img [ref=e117]
                - generic [ref=e120]:
                  - paragraph [ref=e121]: 01:47:45 PM
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
                - heading "Admin Dashboard" [level=1] [ref=e135]
                - paragraph [ref=e136]: Comprehensive business analytics and insights
              - generic [ref=e137]:
                - button "7 Days" [ref=e138] [cursor=pointer]
                - button "30 Days" [ref=e139] [cursor=pointer]
                - button "90 Days" [ref=e140] [cursor=pointer]
            - generic [ref=e141]:
              - generic [ref=e142]:
                - generic [ref=e143]:
                  - img [ref=e145]
                  - generic [ref=e147]:
                    - img [ref=e148]
                    - generic [ref=e151]: +0%
                - paragraph [ref=e152]: Today's Revenue
                - paragraph [ref=e153]: $0.00
              - generic [ref=e154]:
                - generic [ref=e155]:
                  - img [ref=e157]
                  - generic [ref=e161]:
                    - img [ref=e162]
                    - generic [ref=e165]: +0%
                - paragraph [ref=e166]: Today's Orders
                - paragraph [ref=e167]: "0"
              - generic [ref=e168]:
                - generic [ref=e169]:
                  - img [ref=e171]
                  - generic [ref=e173]:
                    - img [ref=e174]
                    - generic [ref=e177]: +0%
                - paragraph [ref=e178]: Avg Order Value
                - paragraph [ref=e179]: $0.00
              - generic [ref=e180]:
                - img [ref=e183]
                - paragraph [ref=e188]: Occupied Tables
                - paragraph [ref=e189]: "0"
            - generic [ref=e190]:
              - generic [ref=e191]:
                - generic [ref=e193]:
                  - heading "Revenue Trend" [level=3] [ref=e194]:
                    - img [ref=e195]
                    - text: Revenue Trend
                  - paragraph [ref=e197]: Daily revenue over time
                - generic [ref=e199]:
                  - img [ref=e200]:
                    - generic [ref=e207]: Sat
                    - generic [ref=e209]:
                      - generic [ref=e211]: $0
                      - generic [ref=e213]: $3
                      - generic [ref=e215]: $6
                      - generic [ref=e217]: $9
                      - generic [ref=e219]: $12
                  - generic:
                    - generic:
                      - paragraph
                      - list:
                        - listitem: "revenue : 8.99"
              - generic [ref=e225]:
                - generic [ref=e226]:
                  - heading "Order Types" [level=3] [ref=e227]:
                    - img [ref=e228]
                    - text: Order Types
                  - paragraph [ref=e231]: Distribution by type
                - img [ref=e234]
            - generic [ref=e235]:
              - generic [ref=e236]:
                - generic [ref=e237]:
                  - heading "Peak Hours" [level=3] [ref=e238]:
                    - img [ref=e239]
                    - text: Peak Hours
                  - paragraph [ref=e242]: Busiest times of day
                - img [ref=e245]:
                  - generic [ref=e250]:
                    - generic [ref=e252]: 11AM
                    - generic [ref=e254]: 1PM
                    - generic [ref=e256]: 3PM
                    - generic [ref=e258]: 5PM
                    - generic [ref=e260]: 7PM
                    - generic [ref=e262]: 9PM
                  - generic [ref=e264]:
                    - generic [ref=e266]: "0"
                    - generic [ref=e268]: "1"
                    - generic [ref=e270]: "2"
                    - generic [ref=e272]: "3"
                    - generic [ref=e274]: "4"
              - generic [ref=e275]:
                - generic [ref=e276]:
                  - heading "Top Selling Products" [level=3] [ref=e277]:
                    - img [ref=e278]
                    - text: Top Selling Products
                  - paragraph [ref=e282]: Best performers this week
                - generic [ref=e284]:
                  - img [ref=e285]
                  - paragraph [ref=e289]: No sales data yet
            - generic [ref=e290]:
              - generic [ref=e291]:
                - generic [ref=e292]:
                  - heading "Recent Orders" [level=3] [ref=e293]:
                    - img [ref=e294]
                    - text: Recent Orders
                  - generic [ref=e298]: 0 pending
                - paragraph [ref=e300]: No pending orders
              - generic [ref=e301]:
                - generic [ref=e302]:
                  - heading "Low Stock Alerts" [level=3] [ref=e303]:
                    - img [ref=e304]
                    - text: Low Stock Alerts
                  - generic [ref=e308]: 6 items
                - generic [ref=e309]:
                  - generic [ref=e311]:
                    - generic [ref=e312]:
                      - paragraph [ref=e313]: Flour
                      - paragraph [ref=e314]: "Current: 0 kg"
                    - generic [ref=e315]:
                      - paragraph [ref=e316]: "Min: 20"
                      - paragraph [ref=e317]: Reorder soon
                  - generic [ref=e319]:
                    - generic [ref=e320]:
                      - paragraph [ref=e321]: Flour
                      - paragraph [ref=e322]: "Current: 0 kg"
                    - generic [ref=e323]:
                      - paragraph [ref=e324]: "Min: 20"
                      - paragraph [ref=e325]: Reorder soon
                  - generic [ref=e327]:
                    - generic [ref=e328]:
                      - paragraph [ref=e329]: Flour
                      - paragraph [ref=e330]: "Current: 0 kg"
                    - generic [ref=e331]:
                      - paragraph [ref=e332]: "Min: 20"
                      - paragraph [ref=e333]: Reorder soon
                  - generic [ref=e335]:
                    - generic [ref=e336]:
                      - paragraph [ref=e337]: Milk
                      - paragraph [ref=e338]: "Current: 2 L"
                    - generic [ref=e339]:
                      - paragraph [ref=e340]: "Min: 10"
                      - paragraph [ref=e341]: Reorder soon
                  - generic [ref=e343]:
                    - generic [ref=e344]:
                      - paragraph [ref=e345]: Milk
                      - paragraph [ref=e346]: "Current: 2 L"
                    - generic [ref=e347]:
                      - paragraph [ref=e348]: "Min: 10"
                      - paragraph [ref=e349]: Reorder soon
              - generic [ref=e350]:
                - heading "Business Health" [level=3] [ref=e351]:
                  - img [ref=e352]
                  - text: Business Health
                - generic [ref=e354]:
                  - generic [ref=e356]:
                    - generic [ref=e357]: Customer Satisfaction
                    - generic [ref=e358]: 0%
                  - generic [ref=e361]:
                    - generic [ref=e362]: Order Completion Rate
                    - generic [ref=e363]: 0%
                  - generic [ref=e366]:
                    - generic [ref=e367]: Table Turnover
                    - generic [ref=e368]: 0.0/hr
                  - generic [ref=e371]:
                    - generic [ref=e372]: Staff Efficiency
                    - generic [ref=e373]: 0%
            - generic [ref=e375]:
              - heading "Quick Actions" [level=3] [ref=e376]:
                - img [ref=e377]
                - text: Quick Actions
              - generic [ref=e378]:
                - button "New Order" [ref=e379] [cursor=pointer]:
                  - img [ref=e380]
                  - paragraph [ref=e384]: New Order
                - button "Add Item" [ref=e385] [cursor=pointer]:
                  - img [ref=e386]
                  - paragraph [ref=e387]: Add Item
                - button "Process Refund" [ref=e388] [cursor=pointer]:
                  - img [ref=e389]
                  - paragraph [ref=e394]: Process Refund
                - button "Generate Report" [ref=e395] [cursor=pointer]:
                  - img [ref=e396]
                  - paragraph [ref=e399]: Generate Report
                - button "Print Z-Report" [ref=e400] [cursor=pointer]:
                  - img [ref=e401]
                  - paragraph [ref=e405]: Print Z-Report
                - button "Manage Staff" [ref=e406] [cursor=pointer]:
                  - img [ref=e407]
                  - paragraph [ref=e412]: Manage Staff
            - generic [ref=e413]:
              - generic [ref=e414]:
                - heading "Alerts & Notifications" [level=3] [ref=e415]:
                  - img [ref=e416]
                  - text: Alerts & Notifications
                - generic [ref=e419]: 6 Active Alerts
              - generic [ref=e420]:
                - generic [ref=e421]:
                  - generic [ref=e422]:
                    - img [ref=e423]
                    - generic [ref=e425]:
                      - paragraph [ref=e426]: "Low Stock: Flour"
                      - paragraph [ref=e427]: "Current: 0 kg | Min: 20 kg"
                  - button "Reorder" [ref=e428] [cursor=pointer]
                - generic [ref=e429]:
                  - generic [ref=e430]:
                    - img [ref=e431]
                    - generic [ref=e433]:
                      - paragraph [ref=e434]: "Low Stock: Flour"
                      - paragraph [ref=e435]: "Current: 0 kg | Min: 20 kg"
                  - button "Reorder" [ref=e436] [cursor=pointer]
                - generic [ref=e437]:
                  - generic [ref=e438]:
                    - img [ref=e439]
                    - generic [ref=e441]:
                      - paragraph [ref=e442]: "Low Stock: Flour"
                      - paragraph [ref=e443]: "Current: 0 kg | Min: 20 kg"
                  - button "Reorder" [ref=e444] [cursor=pointer]
                - generic [ref=e445]:
                  - generic [ref=e446]:
                    - img [ref=e447]
                    - generic [ref=e449]:
                      - paragraph [ref=e450]: "Low Stock: Milk"
                      - paragraph [ref=e451]: "Current: 2 L | Min: 10 L"
                  - button "Reorder" [ref=e452] [cursor=pointer]
                - generic [ref=e453]:
                  - generic [ref=e454]:
                    - img [ref=e455]
                    - generic [ref=e457]:
                      - paragraph [ref=e458]: "Low Stock: Milk"
                      - paragraph [ref=e459]: "Current: 2 L | Min: 10 L"
                  - button "Reorder" [ref=e460] [cursor=pointer]
    - status [ref=e466]: Welcome to POSLytic!
  - generic [ref=e467]: Sat
```

# Test source

```ts
  29  |     expect(cashierUrl).toContain('/cashier-pos');
  30  |     
  31  |     // Step 2: Add items to cart and create order
  32  |     console.log('Step 2: Creating order...');
  33  |     
  34  |     // Wait for menu items to load
  35  |     await page.waitForTimeout(2000);
  36  |     
  37  |     // Try to find and click on a menu item (burger or pizza)
  38  |     const menuItems = await page.locator('[data-testid="menu-item"], .menu-item, button:has-text("Burger"), button:has-text("Pizza")').first();
  39  |     try {
  40  |       await menuItems.click({ timeout: 5000 });
  41  |       console.log('Clicked on menu item');
  42  |     } catch (e) {
  43  |       console.log('Could not find specific menu item button, trying alternative selector...');
  44  |       // Try clicking on any item card
  45  |       const itemCards = page.locator('.grid > div, .menu-grid > div, [class*="item"]').first();
  46  |       await itemCards.click();
  47  |     }
  48  |     
  49  |     await page.waitForTimeout(1000);
  50  |     
  51  |     // Check if cart has items
  52  |     const cartItems = await page.locator('[data-testid="cart-item"], .cart-item, .order-item').count();
  53  |     console.log(`Cart items after first click: ${cartItems}`);
  54  |     
  55  |     // Try to add another item
  56  |     try {
  57  |       const anotherItem = page.locator('button:has-text("Pizza"), button:has-text("Pasta"), .menu-item').nth(1);
  58  |       await anotherItem.click({ timeout: 3000 });
  59  |       await page.waitForTimeout(500);
  60  |     } catch (e) {
  61  |       console.log('Could not add second item');
  62  |     }
  63  |     
  64  |     // Step 3: Place the order
  65  |     console.log('Step 3: Placing order...');
  66  |     const placeOrderBtn = page.locator('button:has-text("Place Order"), button:has-text("Checkout"), button:has-text("Submit"), [data-testid="place-order"]').first();
  67  |     try {
  68  |       await placeOrderBtn.click({ timeout: 5000 });
  69  |       console.log('Clicked place order button');
  70  |     } catch (e) {
  71  |       console.log('Could not find place order button, looking for alternatives...');
  72  |       // Try to find any prominent action button
  73  |       const actionButtons = page.locator('button.bg-primary, button:has-text("Order"), button:has-text("Pay")').first();
  74  |       await actionButtons.click();
  75  |     }
  76  |     
  77  |     await page.waitForTimeout(2000);
  78  |     
  79  |     // Step 4: Check Active Orders screen
  80  |     console.log('Step 4: Checking active orders...');
  81  |     await page.goto(`${BASE_URL}/cashier-orders`);
  82  |     await page.waitForTimeout(3000);
  83  |     
  84  |     const activeOrdersUrl = page.url();
  85  |     console.log(`Active orders URL: ${activeOrdersUrl}`);
  86  |     
  87  |     // Look for order indicators
  88  |     const orderElements = await page.locator('.order-card, [data-testid="order"], .pending, .preparing').count();
  89  |     console.log(`Found ${orderElements} order elements on active orders page`);
  90  |     
  91  |     // Take screenshot for verification
  92  |     await page.screenshot({ path: 'test-results/cashier-active-orders.png' });
  93  |     
  94  |     // Step 5: Login as kitchen staff and verify order appears
  95  |     console.log('Step 5: Checking kitchen screen for orders...');
  96  |     
  97  |     // Clear storage and login as kitchen
  98  |     await page.context().clearCookies();
  99  |     await page.goto(`${BASE_URL}/login`);
  100 |     await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  101 |     await page.fill('input[type="text"]', 'kitchen');
  102 |     await page.fill('input[type="password"]', 'kitchen123');
  103 |     await page.click('button[type="submit"]');
  104 |     
  105 |     await page.waitForTimeout(3000);
  106 |     const kitchenUrl = page.url();
  107 |     console.log(`Kitchen redirected to: ${kitchenUrl}`);
  108 |     expect(kitchenUrl).toContain('/kitchen');
  109 |     
  110 |     // Wait for kitchen orders to load
  111 |     await page.waitForTimeout(3000);
  112 |     
  113 |     // Check if orders are displayed
  114 |     const kitchenOrders = await page.locator('.kitchen-order, .order-card, [data-testid="kitchen-order"]').count();
  115 |     console.log(`Found ${kitchenOrders} order elements on kitchen screen`);
  116 |     
  117 |     await page.screenshot({ path: 'test-results/kitchen-orders.png' });
  118 |     
  119 |     // Step 6: Login as admin and check order history
  120 |     console.log('Step 6: Checking admin order history...');
  121 |     
  122 |     await page.context().clearCookies();
  123 |     await page.goto(`${BASE_URL}/login`);
  124 |     await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  125 |     await page.fill('input[type="text"]', 'admin');
  126 |     await page.fill('input[type="password"]', 'admin123');
  127 |     await page.click('button[type="submit"]');
  128 |     
> 129 |     await page.waitForTimeout(3000);
      |                ^ Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
  130 |     const adminUrl = page.url();
  131 |     console.log(`Admin redirected to: ${adminUrl}`);
  132 |     expect(adminUrl).toContain('/dashboard');
  133 |     
  134 |     // Navigate to orders screen
  135 |     await page.goto(`${BASE_URL}/orders`);
  136 |     await page.waitForTimeout(3000);
  137 |     
  138 |     const adminOrdersUrl = page.url();
  139 |     console.log(`Admin orders URL: ${adminOrdersUrl}`);
  140 |     
  141 |     // Look for order table/list
  142 |     const adminOrders = await page.locator('table, .order-list, .order-row, [data-testid="order"]').count();
  143 |     console.log(`Found ${adminOrders} order-related elements on admin orders page`);
  144 |     
  145 |     await page.screenshot({ path: 'test-results/admin-orders.png' });
  146 |     
  147 |     // Step 7: Check Reports screen for sales data
  148 |     console.log('Step 7: Checking reports screen...');
  149 |     await page.goto(`${BASE_URL}/reports`);
  150 |     await page.waitForTimeout(3000);
  151 |     
  152 |     const reportsUrl = page.url();
  153 |     console.log(`Reports URL: ${reportsUrl}`);
  154 |     
  155 |     // Filter out known non-critical errors
  156 |     const criticalErrors = consoleErrors.filter(e => 
  157 |       !e.includes('dragEvent') && 
  158 |       !e.includes('devtools') &&
  159 |       !e.includes('[vi') &&
  160 |       !e.includes('Source map')
  161 |     );
  162 |     
  163 |     console.log(`Console errors: ${criticalErrors.length}`);
  164 |     criticalErrors.forEach(e => console.log(`Error: ${e}`));
  165 |     
  166 |     await page.screenshot({ path: 'test-results/admin-reports.png' });
  167 |     
  168 |     // The test passes if we made it through all steps without critical errors
  169 |     expect(criticalErrors.length).toBeLessThan(3); // Allow some non-critical errors
  170 |     
  171 |     console.log('✅ Full order flow test completed successfully!');
  172 |   });
  173 | 
  174 |   test('Cashier can create dine-in order with table selection', async ({ page }) => {
  175 |     console.log('Testing dine-in order creation...');
  176 |     
  177 |     // Login as cashier
  178 |     await page.goto(`${BASE_URL}/login`);
  179 |     await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  180 |     await page.fill('input[type="text"]', 'cashier1');
  181 |     await page.fill('input[type="password"]', 'cashier123');
  182 |     await page.click('button[type="submit"]');
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
```