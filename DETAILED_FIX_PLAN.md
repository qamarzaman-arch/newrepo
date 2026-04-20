# Detailed Project Review & Fix Plan
## Restaurant Management System (RMS)

**Date:** April 2026  
**Reviewer:** Code Review Audit  
**Overall Status:** ~45% Complete — NOT PRODUCTION READY

---

## 🔴 CRITICAL ARCHITECTURE MISMATCHES (Backend vs Frontend)

### 1. Database Provider Mismatch
- **ARCHITECTURE.md** says: PostgreSQL 15+
- **schema.prisma** uses: `provider = "mysql"` with `@db.Text`, `@db.LongText` (MySQL-specific)
- **.env.example** says: `DATABASE_URL="postgresql://..."`
- **Impact:** App will NOT start. Prisma will fail at runtime.
- **Fix:** Decide on ONE database. Either change `schema.prisma` to `provider = "postgresql"` and replace `@db.Text`/`@db.LongText` with `@db.Text` (PG-compatible) or update `.env.example` and docs to MySQL.

### 2. WebSocket Protocol Mismatch
- **Backend** (`server.ts`): Uses **Socket.IO** server
- **Frontend** (`useWebSocket.ts`): Uses **native WebSocket** (`new WebSocket(wsUrl)`)
- **Impact:** Kitchen real-time updates, order notifications, delivery tracking ALL BROKEN. Native WebSocket cannot connect to Socket.IO server.
- **Fix:** Replace `useWebSocket.ts` with `socket.io-client` connection, OR add a native WS adapter on the backend.

### 3. `prisma` Import Pattern — Will Crash
- **Backend** imports `prisma` from `'../server'` (e.g., `order.routes.ts:4`, `auth.routes.ts:5`)
- **server.ts** exports `prisma` but it's created AFTER `setupRoutes(app)` is called
- **Impact:** Circular dependency or `undefined` at import time. Routes may fail when `prisma` is accessed before initialization.
- **Fix:** Use `global.prisma` pattern consistently, or use dependency injection.

### 4. WebSocketManager Singleton — Null Risk
- `getWebSocketManager()` returns `websocketManager!` (non-null assertion) but can be null if `global.socketIO` isn't set yet
- **Impact:** Order creation, payment processing will crash with `Cannot read properties of null`
- **Fix:** Initialize `WebSocketManager` in `server.ts` before `setupRoutes()`, add null check.

---

## 🔴 CRITICAL CODE BUGS

### 5. Duplicate Refund Payment Records
- **File:** `@apps/backend-api/src/routes/order.routes.ts:731-765`
- The refund endpoint creates **TWO** negative payment records for the same refund:
  - Line 732: `await prisma.payment.create(...)` with `amount: -amount`
  - Line 757: `await prisma.payment.create(...)` with `amount: -amount` AGAIN
- **Impact:** Financial reports will double-count refunds. Cash drawer reconciliation will be wrong.
- **Fix:** Remove the duplicate `prisma.payment.create` at line 757.

### 6. Order `as any` Type Casting Hides Schema Mismatches
- **File:** `@apps/backend-api/src/routes/order.routes.ts:332`
- `as any` cast on order creation data bypasses TypeScript checking
- **Impact:** Schema changes won't be caught at compile time. Runtime errors possible.
- **Fix:** Define proper Prisma input types and remove `as any`.

### 7. Settings Store — Manager PIN Stored in Plain Text (Client-Side)
- **File:** `@apps/pos-desktop/src/renderer/stores/settingsStore.ts:107`
- `managerPin: '123456'` stored in localStorage via Zustand persist
- **Impact:** Anyone can read the PIN from browser DevTools. Security bypass.
- **Fix:** Never store PIN client-side. Always validate via backend (`/auth/validate-pin`).

### 8. Auth Register Endpoint — No Authentication Required
- **File:** `@apps/backend-api/src/routes/auth.routes.ts:116`
- `router.post('/register')` has NO `authenticate` middleware
- **Impact:** Anyone can create ADMIN users via API. Critical security vulnerability.
- **Fix:** Add `authenticate` + `authorize('ADMIN')` middleware to register route.

### 9. Payment Gateway Refund — PIN Check Not Implemented
- **File:** `@apps/backend-api/src/routes/payment-gateway.routes.ts:96-101`
- Manager PIN verification is just a comment: `// Verify PIN logic here`
- **Impact:** Refunds can be processed without manager approval.
- **Fix:** Implement the same PIN verification as in `order.routes.ts` refund endpoint.

### 10. Payment Status Endpoint — Returns Hardcoded Placeholder
- **File:** `@apps/backend-api/src/routes/payment-gateway.routes.ts:165-182`
- Always returns `status: 'pending'` regardless of actual payment state
- **Impact:** Frontend can never confirm if a payment succeeded via gateway.
- **Fix:** Query Stripe for actual payment intent status.

---

## 🟠 HIGH PRIORITY — FRONTEND/BACKEND DISCONNECTS

### 11. Frontend Tax Calculation vs Backend Tax Calculation
- **Frontend** (`orderStore.ts:376-381`): Calculates tax using `settingsStore.taxRate` (local config)
- **Backend** (`order.routes.ts:277-281`): Calculates tax from `Setting` table in DB (`tax_rate` key)
- **Impact:** Frontend shows different total than what backend charges. Customer sees one price, receipt shows another.
- **Fix:** Frontend should fetch tax rate from backend `/settings` API, not from local store.

### 12. Frontend Service Charge vs Backend Surcharge
- **Frontend** (`orderStore.ts:384-389`): Calculates service charge from `settingsStore.serviceCharge`
- **Backend** (`order.routes.ts:283-301`): Calculates surcharge from `Surcharge` table (multiple surcharges, different types)
- **Impact:** Same as #11 — totals will differ between frontend preview and backend charge.
- **Fix:** Frontend should fetch applicable surcharges from backend API.

### 13. Order `WALK_IN` Type Not in Frontend
- **Backend** (`order.routes.ts:14`): `orderType` enum includes `WALK_IN`
- **Frontend** (`orderStore.ts:39`): Order types are `DINE_IN | TAKEAWAY | DELIVERY | PICKUP`
- **Impact:** If backend sends `WALK_IN` orders, frontend can't handle them.
- **Fix:** Add `WALK_IN` to frontend order types or remove from backend schema.

### 14. `RESERVATION` Order Type — Not in Zod Schema
- **Backend** (`order.routes.ts:14`): `createOrderSchema` doesn't include `RESERVATION`
- **Backend** (`order.routes.ts:117-176`): Separate reservation endpoints use `orderType: 'RESERVATION'`
- **Impact:** Can't create a reservation through the normal order flow. Reservation endpoints lack validation.
- **Fix:** Add `RESERVATION` to `createOrderSchema` or add Zod validation to reservation endpoints.

### 15. Web-Admin Has No Authentication
- **File:** `@apps/web-admin/app/page.tsx`
- No login page, no auth check, no token management
- Directly calls backend API without authentication headers
- **Impact:** Web admin panel is completely unprotected.
- **Fix:** Add Next.js middleware for auth, login page, and API client with token.

### 16. Web-Admin Pages Are Skeletons
- `/inventory`, `/menu`, `/staff`, `/reports` pages exist but are minimal
- No CRUD operations, no forms, no data management
- **Impact:** Web admin is essentially just a dashboard with no management capability.
- **Fix:** Build out each page with full CRUD functionality.

---

## 🟠 HIGH PRIORITY — MISSING INTEGRATIONS

### 17. Kitchen Display — No Real-Time Updates
- **Backend** emits Socket.IO events (`order:new`, `ticket:created`)
- **Frontend** (`useWebSocket.ts`) uses native WebSocket → can't receive Socket.IO events
- **KitchenScreen** doesn't use `useKitchenWebSocket` hook effectively
- **Impact:** Kitchen staff must manually refresh to see new orders.
- **Fix:** Switch frontend to `socket.io-client`, connect kitchen screen to `kitchen` room.

### 18. Receipt Printing — Not Integrated
- `SettingsScreen` has toggles for `autoPrintKOT` and `autoPrintReceipt`
- `hardwareManager.ts` exists but no actual printer driver integration
- `ShiftSummary` uses `window.print()` (browser print, not thermal printer)
- **Impact:** Cannot print receipts or KOT tickets on thermal printers.
- **Fix:** Integrate `electron-printer` or `node-thermal-printer` package.

### 19. Cash Drawer Service — Incomplete Backend
- **Frontend** (`cashDrawerService.ts`): Calls `cashDrawerService.getCurrent()`, `open()`, `close()`
- **Backend** (`cash-drawer.routes.ts`): Has routes but missing some endpoints
- **Impact:** Cash drawer open/close may fail silently.
- **Fix:** Verify all frontend service methods map to working backend endpoints.

### 20. Loyalty System — Backend Missing
- **Schema** has `LoyaltyTransaction` model and `Customer.loyaltyPoints` field
- **Frontend** has `useLoyalty.ts` hook and `loyaltyService.ts`
- **Backend** has NO loyalty routes, NO points calculation, NO redemption endpoints
- **Impact:** Loyalty points are never earned or redeemed.
- **Fix:** Create `loyalty.routes.ts` with earn/redeem/balance endpoints.

### 21. Commission Calculation — Backend Missing
- **Schema** has `StaffPerformance` model
- **Backend** has `commission.routes.ts` file
- **Frontend** has `AdvancedStaffScreen` showing commission
- But commission calculation logic is incomplete
- **Impact:** Staff can't see accurate commission earnings.
- **Fix:** Implement commission calculation in `commission.routes.ts`.

---

## 🟡 MEDIUM PRIORITY — DATA INTEGRITY ISSUES

### 22. Inventory Auto-Deduction — Only Works With Recipes
- **Backend** (`order.routes.ts:370-442`): Auto-deducts inventory ONLY if `Recipe` exists for menu item
- If no recipe is linked, inventory is NOT deducted at all
- **Impact:** Most menu items likely have no recipes → inventory never decreases.
- **Fix:** Add direct inventory deduction option (e.g., link MenuItem directly to InventoryItem with quantity).

### 23. StockAlert Table Doesn't Exist in Schema
- **Backend** (`order.routes.ts:424-437`): Tries to create `stockAlert` records
- **Prisma schema**: No `StockAlert` model exists
- **Impact:** Low stock alerts silently fail (caught by try/catch but never created).
- **Fix:** Add `StockAlert` model to Prisma schema.

### 24. `previousStock` Field Missing in StockMovement Create
- **Backend** (`order.routes.ts:410-418`): Creates `stockMovement` without `previousStock` and `newStock`
- **Schema** (`StockMovement`): Requires `previousStock` and `newStock` fields
- **Impact:** Stock movement creation will fail with Prisma validation error.
- **Fix:** Include `previousStock` and `newStock` in the create call.

### 25. Order Number Race Condition
- **Backend** (`order.routes.ts:221-228`): Counts orders then generates number
- Two concurrent orders can get the same number
- `orderNumber` has `@unique` constraint → second order will fail
- **Impact:** Order creation fails under concurrent load.
- **Fix:** Use database sequence or atomic counter for order numbers.

### 26. Missing `performedById` in StockMovement
- **Backend** (`order.routes.ts:410-418`): Doesn't set `performedById` on stock movement
- **Schema**: `performedById` is optional (`String?`), so it won't crash
- **Impact:** Can't track who caused inventory changes.
- **Fix:** Pass `req.user.userId` as `performedById`.

### 27. `WALK_IN` Order Type — Not in Schema Enum
- **Backend** `createOrderSchema` includes `WALK_IN` but schema `Order.orderType` is just `String`
- No validation at DB level for valid order types
- **Impact:** Any string can be stored as orderType, leading to data inconsistency.
- **Fix:** Consider using Prisma enum for orderType, or add validation at application level.

---

## 🟡 MEDIUM PRIORITY — FRONTEND ISSUES

### 28. ReportsScreen — P&L Uses Estimated COGS
- **File:** `@apps/pos-desktop/src/renderer/screens/ReportsScreen.tsx:78`
- `const costOfGoods = (salesData.totalOrders || 0) * 5; // Estimated COGS`
- Hardcoded $5 per order for cost of goods — completely inaccurate
- **Impact:** Profit & Loss reports show wrong numbers.
- **Fix:** Calculate COGS from recipe costs or inventory item costs in backend API.

### 29. ReportsScreen — Export Doesn't Actually Export
- **File:** `@apps/pos-desktop/src/renderer/screens/ReportsScreen.tsx:101-103`
- `handleExport` just shows a toast "exported successfully" without generating any file
- **Impact:** Users think report was exported but nothing happens.
- **Fix:** Implement CSV/PDF generation like `ShiftSummary` does.

### 30. SettingsScreen — Settings Not Synced to Backend
- **File:** `@apps/pos-desktop/src/renderer/screens/SettingsScreen.tsx`
- Settings are saved only to localStorage via Zustand persist
- Backend has `Setting` model and `/settings` API
- **Impact:** Settings changes don't persist across devices or after clearing browser data.
- **Fix:** Save settings to backend API, load from API on startup.

### 31. SettingsScreen — Manager PIN Editable as Plain Text
- **File:** `@apps/pos-desktop/src/renderer/screens/SettingsScreen.tsx:91`
- Manager PIN shown as editable text input
- No masking, no confirmation, no server-side validation
- **Impact:** Anyone with settings access can see/change the PIN.
- **Fix:** Mask PIN input, require current PIN to change, save hashed to backend.

### 32. ShiftSummary — Opening Balance in localStorage
- **File:** `@apps/pos-desktop/src/renderer/screens/CashierPOS/ShiftSummary.tsx:35-38`
- Opening balance loaded from `localStorage.getItem('pos_opening_balance')`
- Can be manipulated via DevTools
- **Impact:** Cash drawer reconciliation can be faked.
- **Fix:** Always fetch opening balance from backend CashDrawer record.

### 33. OrderStore — Tax Calculation Uses Local Settings
- **File:** `@apps/pos-desktop/src/renderer/stores/orderStore.ts:376-381`
- Tax rate from `useSettingsStore` (localStorage) instead of backend
- **Impact:** Frontend order total may differ from backend-calculated total.
- **Fix:** Fetch tax/surcharge rates from backend before showing order total.

### 34. CashierActiveOrders — 52KB File
- **File:** `@apps/pos-desktop/src/renderer/screens/CashierPOS/CashierActiveOrders.tsx`
- Extremely large component file (52K+ bytes)
- Likely has performance issues and is hard to maintain
- **Fix:** Break into smaller sub-components.

---

## 🟡 MEDIUM PRIORITY — BACKEND ISSUES

### 35. No Input Sanitization on Most Routes
- Only `order.routes.ts` and `auth.routes.ts` use Zod validation
- Other routes (customer, menu, inventory, etc.) trust `req.body` directly
- **Impact:** SQL injection (mitigated by Prisma), but XSS and data corruption possible.
- **Fix:** Add Zod schemas to ALL route handlers.

### 36. No Role-Based Authorization on Routes
- `auth.ts` exports `authorize()` middleware but it's NEVER used in any route
- Any authenticated user can access any endpoint
- **Impact:** Cashier can delete menu items, kitchen staff can view financial reports.
- **Fix:** Add `authorize('ADMIN', 'MANAGER')` to sensitive routes.

### 37. Session Cleanup — No Cron Job
- Expired sessions accumulate in database
- Only cleaned up when the same user tries to use an expired token
- **Impact:** Database bloat over time.
- **Fix:** Add periodic session cleanup (cron job or Prisma middleware).

### 38. No Pagination on Several Endpoints
- `customer.routes.ts`, `inventory.routes.ts`, `kitchen.routes.ts` return all records
- **Impact:** Performance degrades as data grows. 10K+ orders = slow API.
- **Fix:** Add pagination (skip/take) to all list endpoints.

### 39. `payment-gateway.routes.ts` Webhook — Raw Body Needed
- Stripe webhook signature verification requires raw request body
- Express `json()` middleware parses body before webhook handler
- **Impact:** Stripe webhook signature verification will fail.
- **Fix:** Use `express.raw({ type: 'application/json' })` for webhook endpoint.

### 40. No Rate Limiting on Auth Endpoints
- Global rate limiter applies to `/api/` prefix
- But login endpoint allows 1000 requests per 15 min per IP
- **Impact:** Brute force attacks on PIN (4 digits = 10K combinations) are feasible.
- **Fix:** Add stricter rate limiting on `/api/v1/auth/login` (e.g., 10 attempts per 15 min).

---

## 🔵 LOW PRIORITY — MISSING PACKAGES & FEATURES

### 41. `packages/shared-types` — Doesn't Exist
- **ARCHITECTURE.md** references `packages/shared-types`
- Directory doesn't exist in the repo
- **Impact:** No shared type safety between frontend and backend.
- **Fix:** Create shared types package with Prisma-generated types and API interfaces.

### 42. `packages/sync-engine` — Doesn't Exist
- **ARCHITECTURE.md** references `packages/sync-engine`
- Directory doesn't exist
- Frontend has `offlineQueueManager.ts` (basic localStorage queue)
- Backend has `sync.routes.ts` and `SyncQueue`/`SyncLog` models
- **Impact:** No proper offline-first sync with conflict resolution.
- **Fix:** Build sync engine package or integrate existing offline queue with backend sync API.

### 43. `packages/ui-components` — Exists But Unused
- Package exists with basic setup but no POS components use it
- **Impact:** Duplicated UI code across screens.
- **Fix:** Extract common components (cards, modals, tables) into shared package.

### 44. No Test Coverage
- `role-tests.spec.ts` exists at root but appears incomplete
- `playwright.config.ts` exists but no E2E tests found
- Jest config exists but minimal `__tests__` directories
- **Impact:** No automated quality gate.
- **Fix:** Add unit tests for services, integration tests for API routes.

### 45. No Docker/Deployment Configuration
- ARCHITECTURE.md mentions Docker, Nginx, SSL
- No `Dockerfile`, `docker-compose.yml`, or deployment scripts exist
- **Impact:** Manual deployment process, environment inconsistencies.
- **Fix:** Create Docker configuration for backend and database.

---

## 📋 PRIORITIZED FIX PLAN

### Phase 1: Critical Fixes (Week 1-2) — System Must Start & Work

| # | Issue | Priority | Effort | Files |
|---|-------|----------|--------|-------|
| 1 | Fix DB provider mismatch (MySQL vs PostgreSQL) | CRITICAL | 2h | `schema.prisma`, `.env.example` |
| 2 | Fix WebSocket protocol mismatch (Socket.IO vs native WS) | CRITICAL | 4h | `useWebSocket.ts`, `package.json` |
| 3 | Fix Prisma import/circular dependency | CRITICAL | 2h | All route files, `server.ts` |
| 4 | Fix WebSocketManager null crash | CRITICAL | 1h | `websocket.ts`, `server.ts` |
| 5 | Remove duplicate refund payment record | CRITICAL | 0.5h | `order.routes.ts` |
| 8 | Add auth to register endpoint | CRITICAL | 0.5h | `auth.routes.ts` |
| 9 | Implement PIN check in payment gateway refund | CRITICAL | 1h | `payment-gateway.routes.ts` |
| 23 | Add `StockAlert` model to Prisma schema | HIGH | 1h | `schema.prisma` |
| 24 | Fix StockMovement missing fields | HIGH | 0.5h | `order.routes.ts` |

### Phase 2: Data Integrity & Security (Week 3-4)

| # | Issue | Priority | Effort | Files |
|---|-------|----------|--------|-------|
| 7 | Remove plain-text PIN from client storage | HIGH | 2h | `settingsStore.ts`, `SettingsScreen.tsx` |
| 11 | Sync tax calculation between frontend/backend | HIGH | 3h | `orderStore.ts`, `order.routes.ts` |
| 12 | Sync surcharge calculation between frontend/backend | HIGH | 2h | `orderStore.ts`, `order.routes.ts` |
| 15 | Add authentication to web-admin | HIGH | 4h | `web-admin/app/` |
| 17 | Fix kitchen real-time updates | HIGH | 4h | `useWebSocket.ts`, `AdvancedKitchenScreen.tsx` |
| 35 | Add Zod validation to all routes | HIGH | 6h | All route files |
| 36 | Add role-based authorization to routes | HIGH | 4h | All route files |
| 40 | Add rate limiting to auth endpoints | HIGH | 1h | `auth.routes.ts`, `server.ts` |
| 25 | Fix order number race condition | HIGH | 2h | `order.routes.ts` |

### Phase 3: Feature Completion (Week 5-8)

| # | Issue | Priority | Effort | Files |
|---|-------|----------|--------|-------|
| 20 | Implement loyalty system backend | MEDIUM | 6h | New `loyalty.routes.ts` |
| 21 | Implement commission calculation | MEDIUM | 4h | `commission.routes.ts` |
| 22 | Fix inventory deduction without recipes | MEDIUM | 3h | `order.routes.ts` |
| 28 | Fix P&L report COGS calculation | MEDIUM | 3h | `report.routes.ts`, `ReportsScreen.tsx` |
| 29 | Implement report export (CSV/PDF) | MEDIUM | 4h | `ReportsScreen.tsx` |
| 30 | Sync settings to backend | MEDIUM | 3h | `SettingsScreen.tsx`, `setting.routes.ts` |
| 32 | Move opening balance to backend | MEDIUM | 2h | `ShiftSummary.tsx` |
| 33 | Fetch tax/surcharge from backend | MEDIUM | 2h | `orderStore.ts` |
| 38 | Add pagination to all list endpoints | MEDIUM | 4h | All route files |
| 39 | Fix Stripe webhook raw body | MEDIUM | 1h | `payment-gateway.routes.ts` |

### Phase 4: Architecture & Quality (Week 9-12)

| # | Issue | Priority | Effort | Files |
|---|-------|----------|--------|-------|
| 41 | Create shared-types package | LOW | 4h | `packages/shared-types/` |
| 42 | Build sync-engine package | LOW | 8h | `packages/sync-engine/` |
| 43 | Extract shared UI components | LOW | 6h | `packages/ui-components/` |
| 16 | Build out web-admin pages | LOW | 16h | `web-admin/app/` |
| 18 | Integrate thermal printer | LOW | 6h | `hardwareManager.ts` |
| 37 | Add session cleanup cron | LOW | 2h | `server.ts` |
| 44 | Add test coverage | LOW | 16h | Multiple |
| 45 | Create Docker/deployment config | LOW | 4h | Root |
| 34 | Refactor large components | LOW | 4h | `CashierActiveOrders.tsx` |
| 6 | Remove `as any` type casts | LOW | 3h | `order.routes.ts` |

---

## 📊 SUMMARY METRICS

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Architecture Mismatches | 4 | 0 | 0 | 0 | 4 |
| Code Bugs | 3 | 0 | 0 | 0 | 3 |
| Frontend/Backend Disconnects | 0 | 4 | 4 | 0 | 8 |
| Missing Integrations | 0 | 3 | 0 | 0 | 3 |
| Data Integrity | 0 | 0 | 6 | 0 | 6 |
| Frontend Issues | 0 | 0 | 5 | 1 | 6 |
| Backend Issues | 0 | 0 | 4 | 0 | 4 |
| Missing Packages/Features | 0 | 0 | 0 | 5 | 5 |
| Security | 2 | 2 | 0 | 0 | 4 |
| **Total** | **9** | **9** | **19** | **6** | **43** |

**Estimated Total Effort:** ~120 developer-hours  
**Recommended Team Size:** 2-3 developers  
**Estimated Timeline:** 10-12 weeks for full completion

---

## ⚡ IMMEDIATE ACTION ITEMS (Do Today)

1. **Fix database provider** — Decide MySQL or PostgreSQL, update `schema.prisma` and `.env.example`
2. **Fix WebSocket** — Install `socket.io-client` in POS app, rewrite `useWebSocket.ts`
3. **Fix duplicate refund** — Remove second `prisma.payment.create` in refund endpoint
4. **Lock register endpoint** — Add `authenticate` + `authorize('ADMIN')` middleware
5. **Fix StockMovement create** — Add `previousStock` and `newStock` fields
6. **Add `StockAlert` model** — Add to Prisma schema and run migration

These 6 items can be done in a single day and unblock the most critical functionality.
