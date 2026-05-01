# POSLytic — Restaurant POS System
# Full QA Defect Report

**Application:** restaurant-pos-system (POSLytic) v1.0.0
**Scope:** Backend API + POS Desktop (Electron) + Web Admin (Next.js) + Shared Packages + Database
**Audit Date:** 2026-05-01
**Audit Type:** Static analysis (deep code review). See §0 for runtime/manual tests not yet performed.
**Total Defects Identified:** **297**

---

## Severity Legend
| Level | Meaning | SLA |
|-------|---------|-----|
| **Critical** | Data loss, financial leak, auth bypass, security breach. Blocks release. | Fix before any deployment |
| **High** | Real-world feature failure, race condition, accessibility blocker, data inconsistency. | Fix before next release |
| **Medium** | UX degradation, partial functionality loss, latent bug under load. | Fix this sprint / next |
| **Low** | Minor polish, code-quality, defensive hardening. | Backlog |
| **Info** | Documentation gap, future-enhancement marker. | Optional |

## Aggregate Counts
| App / Layer | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Backend API | 11 | 15 | 56 | 5 | **87** |
| POS Desktop (Electron) | 15 | 22 | 20 | 10 | **67** |
| Web Admin (Next.js) | 8 | 22 | 36 | 19 | **85** |
| Cross-cutting (Schema/Types/Shared/Docker/Tests) | 13 | 13 | 26 | 6 | **58** |
| **GRAND TOTAL** | **47** | **72** | **138** | **40** | **297** |

---

## §0. Boundary of This Audit

**What this report covers (static code review):**
- Source code defects, security holes, validation gaps
- Schema design, migrations, type drift
- Architectural concerns: race conditions, concurrency, cascades
- UI/UX read off code: dark mode, accessibility, form validation
- Build, env, and deployment configuration

**What is NOT covered — manual / runtime QA still required:**
1. **Functional manual testing** — every flow clicked end-to-end on a seeded DB (cashier order → kitchen → checkout → receipt → refund; rider assignment → delivery → cash settlement; QR ordering customer journey; multi-branch switching).
2. **Hardware integration tests** — thermal printer (58mm + 80mm), barcode scanner, cash drawer kick, with both paired and unplugged peripherals.
3. **Load / stress tests** — concurrent cashiers, kitchen during rush, 10k+ orders/day, WebSocket fan-out at scale.
4. **Penetration testing** — actual exploit attempts (auth bypass, SQLi via Prisma raw, IDOR), captured Stripe replay attacks.
5. **Cross-browser / cross-OS** — Web Admin in Chrome / Edge / Firefox / Safari; Electron on Windows / macOS / Linux.
6. **Offline-online transition** — kill network during checkout, hibernate machine, swap WiFi mid-sync.
7. **Localization** — non-English text wrapping, RTL languages (Arabic for AED locale).
8. **Backup / disaster recovery drill** — restore from a 24h-old backup; data integrity post-restore.
9. **Compliance audit** — PCI-DSS for card data flows, GDPR/PII for customer data, fiscal/tax regulator certifications.
10. **Performance profiling** — DB query plans on production-sized data, React re-render storms, memory growth over a 12-hour shift.

A complete QA sign-off requires both this static report AND the manual matrix above.

---

# PART A — BACKEND API DEFECTS (87)

Path: `apps/backend-api/`

## A.1 Authentication & Sessions (`auth.routes.ts`)

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A1 | High | auth.routes.ts:278-346 | Timing attack possible on PIN validation — bcrypt completion time leaks valid-vs-invalid PIN signal. | Add fixed-delay; rate-limit before bcrypt call. |
| A2 | High | auth.routes.ts:49-51 | User enumeration via timing — DB miss returns faster than wrong-password (bcrypt). | Insert artificial delay to match bcrypt cost when user not found. |
| A3 | Medium | auth.routes.ts:261-275 | PIN rate-limit lives in in-memory Map → wiped on restart, bypassed by load-balanced replicas. | Move to DB or Redis (`PinAttempt` table with `userId`, `count`, `resetAt`). |
| A4 | Medium | auth.routes.ts:91-96 | JWT expiry recomputed separately from JWT creation; clock-skew can drift session vs token. | Use single source: derive session.expiresAt from decoded JWT `exp`. |
| A5 | Medium | auth.routes.ts:59-64 | PIN-hash upgrade `await` inside callback — silent failure leaves user stuck on legacy hash. | Try/catch + log; treat upgrade failure as warn-only but log it. |
| A6 | Low | auth.routes.ts:16-22 | `password.optional()` Zod schema lets payload omit password entirely; refinement catches it but inconsistent. | Use discriminated union: `passwordLogin` vs `pinLogin` schemas. |
| A7 | Medium | auth.routes.ts:91-96 | `JWT_EXPIRES_IN` regex parser silently falls back to 30 days if env malformed. | Validate at startup; throw if not parseable. |
| A8 | Medium | (server-wide) | No HTTPS enforcement check — production can run HTTP and silently leak tokens. | Refuse to start in production unless `TRUST_PROXY` + HTTPS enforced. |
| A78 | Low | auth.routes.ts:329 | Logs include user role in PIN-validation log line — leaks access patterns. | Log username + result only; redact role. |

## A.2 Order Routes (`order.routes.ts`)

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A9 | High | order.routes.ts:350-361 | Order-number race: `count()` then `create()` non-atomic → duplicate `ORD-...-0001` under concurrency. | Use `OrderCounter` table with atomic `UPDATE … RETURNING` or DB sequence. |
| A10 | **Critical** | order.routes.ts:547-703 | Inventory deduction inside a transaction but verification of `updateMany.count > 0` missing in places — partial failure can leave audit/stock out of sync. | Assert `count === expectedRows`; rollback explicitly with reason. |
| A11 | Medium | order.routes.ts:146 | If a request bypasses `parsePagination` and submits page=0, skip becomes negative. | Always route through `parsePagination`; guard at use site. |
| A12 | Medium | order.routes.ts:335-348 | Idempotency lookup ignores `expiresAt` — a stale 7-day-old key still hits the cache. | Add `existing.expiresAt > now()` check; auto-purge. |
| A13 | High | order.routes.ts:827-1006 | Discount can be **re-applied** at payment time, mutating `finalTotalAmount`. Fraud vector. | Lock discount at order creation; reject discount change at payment. |
| A14 | Medium | order.routes.ts:742-824 | Order can transition `PREPARING → COMPLETED` even with KOT tickets still cooking. | Block transition unless all KOT tickets in `[COMPLETED, DISPATCHED]`. |
| A15 | **Critical** | order.routes.ts:1131-1142 | Refund cap = `totalPaid` not `min(totalPaid, totalAmount)` — overpaid orders allow over-refund. | Cap at `min(paidAmount, order.totalAmount)`; add DB CHECK constraint. |
| A16 | **Critical** | order.routes.ts:1153-1162 | Refund creates a negative Payment row but **does not call Stripe refund API** — customer never gets money back. | Branch on payment method; call `paymentGatewayService.processStripeRefund()`. Also reverse inventory. |
| A17 | Medium | order.routes.ts:1247-1286 | Modifying order items deletes/recreates `OrderItem`s but leaves stale KOT tickets in `PREPARING`. | Mark old KOT tickets `CANCELLED` and emit new ones for added items. |
| A18 | Medium | order.routes.ts:26 | `quantity` Zod is `z.number().min(1)` — accepts 1.5. | `z.number().int().min(1)`. |
| A19 | Medium | order.routes.ts:367 | `findFirst` on customer phone — duplicates allowed; first one wins randomly. | DB-level `@unique` on `Customer.phone`; use `findUnique`. |
| A20 | Medium | order.routes.ts:199-257 | Reservation creation doesn't verify `tableId` exists or is `AVAILABLE`. | Validate before create; 409 if locked. |

## A.3 Payments & Stripe

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A21 | **Critical** | (no route exists) | **No `/payments/webhooks/stripe` route is registered**. `paymentGateway.service.ts:126-142` defines `handleStripeWebhook` but nothing wires it up — webhook events lost. | Add `POST /api/v1/payments/webhooks/stripe`, raw body, signature verify. |
| A22 | Medium | paymentGateway.service.ts:39-42 | `username` placed in Stripe metadata — PII leaked to Stripe's logs/dashboard. | Use `userId` only. |
| A23 | Medium | paymentGateway.service.ts:36 | `Math.round(amount * 100)` — float precision can drop a cent on values like 10.015. | Use `Decimal` for cents conversion. |
| A24 | Medium | payment.routes.ts:66-77 | `.catch()` on `PaymentValidation` insert returns silently — audit gap when DB insert fails. | Log error explicitly (not silent). |
| A25 | Medium | payment.routes.ts:29-101 | No idempotency key on payment validation — repeated requests create duplicate Stripe `PaymentIntent`s. | Accept `Idempotency-Key`; cache by key. |
| A26 | **Critical** | order.routes.ts:1081-1216 | (Same as A16) refunds don't reach Stripe. Severe financial defect. | See A16. |

## A.4 Menu / Inventory / Recipes

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A27 | Medium | menu.routes.ts:30 | Price `.positive()` lets through `0`. | `.min(0.01)`. |
| A28 | High | inventory.routes.ts | Direct stock-adjustment endpoints don't enforce `currentStock >= 0`; only the order path checks. | Add CHECK constraint at DB; validate at every mutator. |
| A29 | Medium | recipe.routes.ts | `RecipeIngredient.quantity` accepts negative. | `.min(0.01)`. |
| A30 | Medium | inventory.routes.ts:127-129 | `sum + currentStock * costPerUnit` accumulates float error. | Sum in cents using Decimal. |

## A.5 Kitchen / KOT

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A31 | High | kitchen.routes.ts | Two stations PATCH same ticket → last-write-wins, no version check. | Optimistic lock: `WHERE version = ?`, increment on update; return 409 on miss. |
| A32 | Medium | kitchen.routes.ts:13-15 | KOT enum allows backwards transitions (READY → RECEIVED). | State-machine validation. |
| A33 | Medium | order.routes.ts:514-545 | KOT FK lacks cascade on Order delete. | `onDelete: Cascade`. |
| A34 | Low | kitchen.routes (delay) | Delay reason captured but not persisted. | Add `delayReason`, `delayedAt` columns. |

## A.6 Delivery / Rider / Zones

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A35 | **Critical** | delivery-zone.routes.ts:22-26 | Zone polygon stored without validating ≥3 points or self-intersection — breaks point-in-polygon, deliveries silently fail. | Validate polygon at create; reject invalid GeoJSON. |
| A36 | Medium | utils/geo.ts:33 | PIP uses `1e-12` epsilon hack — fails on truly horizontal edges. | Replace with robust ray-casting or use `turf.js`. |
| A37 | Medium | delivery.routes.ts:119-167 | Zone lookup outside transaction with delivery create — zone can be deleted between. | Move both into one transaction. |
| A38 | Medium | delivery.routes.ts | Rider assignment skips `isAvailable` check and active-delivery cap. | Pre-check before assigning. |
| A39 | Medium | delivery.routes.ts:17-18 | Lat/Lng accept any number — no `[-90, 90]` / `[-180, 180]` bounds. | `.min().max()` in Zod. |
| A40 | Medium | delivery-zone.routes.ts:149-152 | `Float` for fees → rounding mode unspecified. | Decimal + explicit rounding. |

## A.7 Cash Drawer / Discounts / Surcharge / Tax

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A41 | High | cash-drawer.routes.ts:139-150 | Discrepancy not flagged when over a threshold — embezzlement undetected. | Add `discrepancyPercent` and alert > 5%. |
| A42 | Medium | cash-drawer.routes.ts:74-75 | `sessionNumber = SHIFT-{date}-{0..9999}` collision risk; not enforced unique at DB. | Use timestamp-ms + DB unique. |
| A43 | High | order.routes.ts:422-435 | Discount code applied without incrementing `usedCount` — `usageLimit` never enforced. | Atomic `UPDATE … SET usedCount = usedCount + 1 WHERE usedCount < usageLimit`. |
| A44 | Medium | order.routes.ts:430 | `maxValue` cap not applied to computed discount. | Clamp `discount = min(discount, maxValue)`. |
| A45 | Medium | order.routes.ts:442 | Tax produces fractional cents not rounded. | Round to 2dp via Decimal. |
| A46 | Medium | order.routes.ts:456-462 | Surcharge applied to pre-discount subtotal — likely wrong per industry convention. | Document intended order, apply consistently. |
| A47 | Medium | expense.routes.ts:89-93 | Same race as A9 (count → create). | DB counter or UUID. |

## A.8 Middleware / Server / CORS / CSRF

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A48 | **Critical** | middleware/auth.ts:48 | JWT verify doesn't validate `iss` claim — token signed by another service with same secret would pass. | `jwt.verify(token, secret, { issuer: 'pos-backend', algorithms: ['HS256'] })`. |
| A49 | Medium | middleware/auth.ts:62-74 | Throws raw errors instead of `next(err)` — bypasses error handler formatting. | `return next(new AppError(...))`. |
| A50 | High | server.ts:73-76 | CORS allows null origin → curl/Postman/desktop bypass — combined with weak CSRF lets state changes through. | Whitelist allowed user-agents or require auth header. |
| A51 | Medium | server.ts:65-68 | Helmet `contentSecurityPolicy: false` — XSS amplified if any path renders HTML. | Set permissive CSP rather than full disable. |
| A52 | **Critical** | server.ts | Stripe webhook raw-body middleware exists but no route consumes it (see A21). | Connect the route. |
| A53 | Medium | middleware/errorHandler.ts:88 | Stack trace leaked when `NODE_ENV !== 'production'` — typo / staging mishap exposes internals. | Gate behind separate `EXPOSE_STACK=true`. |
| A54 | Medium | middleware/rateLimiter.ts:25 | `req.ip` trustable only with proxy config — without `app.set('trust proxy')`, all IPs are the LB. | Configure trust proxy chain length explicitly. |
| A55 | Medium | middleware/rateLimiter.ts:34-40 | Inconsistent rate-limit response shape vs API standard. | Standardize. |
| A56 | Medium | middleware/csrfProtection.ts:7 | GET requests skipped — but state-changing GETs (download triggers, exports) bypass CSRF. | Forbid state-changing GETs at design level. |
| A57 | Medium | middleware/csrfProtection.ts | Only Origin/Referer checked; no synchronizer-token pattern. | Add token-in-header for defense-in-depth. |
| A141 (cross) | Medium | middleware/csrfProtection.ts:6-37 | If `CORS_ORIGIN` is unset, CSRF check **silently skips entirely**. | Fail-closed: reject when no origin policy configured. |

## A.9 Cron Jobs

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A58 | Medium | jobs/sessionCleanup.ts:8-24 | No overlap protection — if a run > 1h, two run concurrently. | Distributed lock (DB row, advisory lock). |
| A59 | Medium | jobs/sessionCleanup.ts:54-76 | Audit logs hard-deleted at 90 days — no archive. | Export to cold storage before delete. |
| A60 | Medium | jobs/sessionCleanup.ts:21-23,45-46,69-70 | Cron failures only logged — no alert. | Hook into alerting (PagerDuty, email). |
| A61 | Medium | server.ts:247-249 | Jobs initialize regardless of DB readiness. | Wait for healthy DB ping. |

## A.10 Prisma Schema (Backend-side findings; full schema cross-cuts in Part D)

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A62 | High | schema.prisma | `PaymentValidation` lacks FK→Order with cascade — orphans on order delete. | Add `orderId` FK + cascade. |
| A63 | Medium | schema.prisma:23 | `User.pin` nullable but multiple paths assume non-null and may crash. | Type-narrow with explicit guards. |
| A64 | Medium | schema.prisma:564 | `Delivery.coordinates Json?` not validated. | DB CHECK or app-side schema. |
| A65 | **Critical** | schema.prisma:660-665 | CashDrawer balance fields `Float`. | Decimal(10,2). |
| A66 | **Critical** | schema.prisma:266 | `Payment.amount` `Float`. | Decimal. |
| A67 | **Critical** | schema.prisma:185 | `Order.totalAmount`, `subtotal`, etc. `Float`. | Decimal across all money fields (~35 fields, see D1). |
| A68 | Medium | schema.prisma:274-277 | No composite index `(orderId, status)` on Payment for reconciliation queries. | `@@index([orderId, status])`. |
| A69 | Medium | schema.prisma:61-71 | `Session.token` not indexed — auth middleware does findFirst by token. | `@@index([token])`. |
| A70 | Medium | schema.prisma:497 | `KotTicket.station` free-form String. | Constrain to enum. |
| A71 | Medium | schema.prisma:189 | `Order.paymentStatus` String not enum. | Enum. |

## A.11 Validation Coverage

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A72 | Medium | order.routes.ts:24-29 | `items.optional()` allows zero-item orders. | Require min(1) or document why. |
| A73 | Medium | menu.routes.ts:26-39 | SKU/barcode duplication possible. | DB unique + Zod refine. |
| A74 | Medium | order.routes.ts:24 | Phone not normalized — same customer split into duplicates. | Normalize before lookup/store. |
| A75 | Medium | server.ts | No Content-Type enforcement; non-JSON bodies cause hard-to-trace failures. | Reject non-JSON 415. |

## A.12 Logging & Secrets

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A76 | Medium | payment.routes.ts:34-37 | Card last-4 in plaintext logs. | Mask: `****`. |
| A77 | Medium | order.routes.ts:284 | Order create log lacks item list — compliance gap. | Include items in audit log. |
| A79 | Medium | (log infra) | No request/correlation ID. | Generate per request, propagate to all log lines. |

## A.13 Test Coverage

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| A80 | Medium | No test for in-memory PIN-rate-limit bypass. | Add restart-safety integration test. |
| A81 | High | No concurrency test for unique order numbers. | Spawn 100 parallel POSTs; assert all unique. |
| A82 | Medium | No test for negative-stock invariant. | Concurrent sale + adjustment test. |
| A83 | High | No test asserting Stripe refund API actually called. | Mock Stripe; assert call. |

## A.14 Other Hardening

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| A84 | Medium | server.ts:98 | Body limit 10MB — too generous for a POS API. | 1MB default; bigger only for image uploads. |
| A85 | Medium | (uploads) | No upload-specific rate limit. | Separate limiter; size + type checks. |
| A86 | Medium | (Prisma errors) | Prisma error details can leak via 500. | Wrap, return generic message in prod. |
| A87 | Medium | server.ts:132 | `$queryRaw` is fine here, but no policy doc — future use is risky. | Lint rule against `$queryRawUnsafe`. |

---

# PART B — POS DESKTOP DEFECTS (67)

Path: `apps/pos-desktop/`

## B.1 Electron Main / IPC / Hardware

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B1 | High | main/index.ts:215-246 | `db-query` IPC accepts `params` array without size or shape limits — large array DOS. | Cap length 50; type-check each. |
| B2 | Medium | main/index.ts:310-320 | CSP set only in production; dev runs without CSP and no `unsafe-eval` lockdown. | Apply CSP in dev too (with HMR-compatible nonce). |
| B3 | High | preload/index.ts:24-42 | `contextBridge` exposes hardware API with no caller-frame check. | `event.senderFrame.url.startsWith('file://')`. |
| B4 | Medium | main/index.ts:333-342 | `db?.close()` race vs in-flight queries on quit. | In-flight counter; drain before close. |
| B5 | Medium | main/index.ts:26-30 | Encrypted storage files written with default umask. | `mode: 0o600`. |
| B81 | Medium | hardware-handlers.ts:104-122 | `Buffer.from(receipt, 'binary')` corrupts UTF-8 (₹, €, ñ) on thermal printer. | Encode to printer charset (CP437/CP858) or use ESC/POS lib. |
| B82 | Low | thermalPrinter.ts | Paper width hardcoded for 58mm; 80mm prints with extra padding. | Configurable `paperWidth`; reflow lines. |
| B83 | Medium | hardware-handlers.ts:104-122 | Printer offline → write hangs → silent failure. | 3s timeout; reject + toast. |

## B.2 Auth / Session

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B6 | High | stores/authStore.ts:74-123 | `initialize()` only treats `NETWORK_ERROR` as recoverable; other 401 paths leave stale token. | Always 401 → clear; decode JWT exp client-side. |
| B7 | High | screens/CashierPOS/AdvancedCashierPOS.tsx | Token can expire mid-order entry; submit explodes after 30 min of typing. | Show idle warning + refresh-token flow; pre-flight token validation on checkout enter. |
| B8 | Medium | stores/authStore.ts:50-72 | Logout in tab A doesn't propagate to tab B (though Electron is usually single-window, multi-window is supported). | `storage` event listener. |
| B9 | Low | LoginScreen | PIN UX: no per-digit feedback, no attempt counter pre-lockout. | Mask + animate dots; show attempts left. |

## B.3 Cashier Flow / Cart Math

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B10 | Medium | stores/orderStore.ts:214-228 | `updateQuantity` removes on ≤ 0 but doesn't clamp negative input from keypads. | Guard at top: `if (qty < 1) removeItem();`. |
| B11 | Medium | screens/CashierPOS/CheckoutPayment.tsx | Discounts can stack > 100% of subtotal. | `discount = min(sum(discounts), subtotal)`. |
| B12 | High | screens/CashierPOS/CheckoutPayment.tsx:102-110 | **Tax / discount / surcharge order is wrong** — formula double-applies discount or applies tax to wrong base. | Document and codify: `taxable = subtotal - discount`; `tax = taxable × rate`; `total = taxable + tax + surcharge + tip`. |
| B13 | High | screens/CashierPOS/SplitBilling.tsx:140-156 | Equal split rounding loses pennies (3 × $3.33 = $9.99 on $10). | First N−1 split normally; last = total − sum(others). |
| B14 | Medium | screens/CashierPOS/CheckoutPayment.tsx:240-260 | Tip captured in state but not sent to backend `createOrder` payload. | Add `tipAmount` to `orderData`. |
| B15 | High | screens/CashierPOS/CheckoutPayment.tsx:172-186,385-392 | `isSubmitting` set but **not in `disabled` condition** — rapid double-click double-submits order. | Include in disabled. |
| B16 | High | screens/CashierPOS/CheckoutPayment.tsx:274-290 | If `createOrder` succeeds but `processPayment` fails (network drop), order persists unpaid with no rollback or retry handle. | Wrap transaction; on payment fail, void order or queue payment retry with the orderId. |
| B17 | Low | screens/CashierPOS/CheckoutPayment.tsx:117-170 | Cash keypad accepts `..`. | Track decimal-already-entered flag. |
| B18 | Medium | stores/orderStore.ts:89-92 | Held orders persist to localStorage **with full customer phone/prices** unencrypted. | Move to safeStorage or in-memory; or hash PII. |
| B19 | Medium | screens/CashierPOS/AdvancedCashierPOS.tsx:375-376 | `currentOrder` not cleared after success → returning to menu shows old items. | `clearOrder()` in `onComplete()`. |

## B.4 Kitchen Display

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B20 | High | screens/AdvancedKitchenScreen.tsx:128-137 | No optimistic update — failed status mutation displays "succeeded" until refetch. | `setQueryData` then revert on error. |
| B21 | High | services/kitchenService.ts | Two stations claim same ticket → no version field → silent overwrite. | Optimistic lock (see A31). |
| B22 | Medium | screens/AdvancedKitchenScreen.tsx:29-38 | New-ticket toast handler not memoized → on remount, duplicate toasts. | `useCallback` + cleanup. |

## B.5 Tables

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B23 | High | screens/TablesScreen.tsx | Two cashiers assign same table simultaneously. | Server-side optimistic lock; 409 to loser. |
| B24 | Medium | (TableLayout) | Drag/resize layout not auto-saved. | Debounce save (5s). |
| B25 | Medium | screens/TablesScreen.tsx:112-117 | `guestCount > capacity` not checked. | Validate. |

## B.6 Customers / Loyalty

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B26 | Low | Customer search fires per keystroke. | 300ms debounce. |
| B27 | Medium | Duplicate phone allowed (server-side too — see A19). | Unique constraint + UI 409 dialog. |
| B28 | Low | Sub-dollar purchases earn 0 points → cumulative loss. | Track fractional points. |

## B.7 Admin CRUD Screens

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B29 | Medium | Forms accept empty name / negative price / NaN qty. | Zod schema; disable submit when invalid. |
| B30 | Low | main.tsx:54-77 | Error toasts auto-dismiss in 3s — too short on slow nets. | 5s + manual dismiss. |
| B31 | High | Optimistic mutations don't roll back on error. | Capture previous data; revert on error. |
| B32 | High | Batch deletes are not atomic. | Backend transaction; UI awaits all-or-none response. |

## B.8 Offline Queue / Sync

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B33 | High | offlineQueueManager.ts:148-156 | At MAX_QUEUE_SIZE 100, "old completed" eviction is silent — newer queued order can be dropped. | Toast warning before add fails. |
| B34 | Medium | offlineQueueManager.ts:119-126 | 4MB limit not per-order — single large order can blow it. | Per-order cap (~2MB). |
| B35 | High | offlineQueueManager.ts:73-79 | 30-second poll regardless of failure — hammers a down server. | Exponential backoff to 5 min. |
| B36 | Medium | syncConflictResolver.ts:55-89 | Conflict detection is timestamp-only, not content-based. | Hash compare. |
| B37 | High | offlineQueueManager.ts:159-160 | `crypto.randomUUID()` alone — collision possible across devices. | `${ts}-${sessionId}-${uuid}`. |
| B38 | High | offlineQueueManager.ts:250-290 | On retry, can re-process payment for already-paid orders → **double charge**. | Verify `paidAmount >= totalAmount` before re-issuing payment. |

## B.9 WebSocket

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B39 | High | hooks/useWebSocket.ts:21-80 | `reconnection: false` + custom `connect()` on every effect → infinite reconnect loop on bad token. | Exponential backoff; max attempts; stop. |
| B40 | High | hooks/useWebSocket.ts:134-137 | Rooms not rejoined after reconnect → kitchen silent. | Track joined rooms; rejoin on `connect`. |
| B41 | High | hooks/useWebSocket.ts:99-120 | `messageHandlers` accumulate across mounts when consumer doesn't unsubscribe. | Document; enforce return-cleanup pattern. |
| B42 | High | (auth flow) | WebSocket not closed on logout — server still trusts old socket. | `disconnect()` in `authStore.logout()`. |

## B.10 Error Boundary

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B43 | Medium | EnhancedErrorBoundary.tsx:80 | TODO: Sentry hook unimplemented. | Integrate `@sentry/electron`. |
| B44 | Low | EnhancedErrorBoundary.tsx:195-227 | "Try Again" only clears error — does not retry the failing call. | Accept `onRetry` prop. |

## B.11 Stores

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B45 | Medium | stores/authStore.ts:126-133 | Hydration race — flash of logged-out UI before `initialize()` completes. | `partialize` only `hasToken`; render gate on hydration complete. |
| B46 | Medium | stores/settingsStore.ts | No schema validation on persisted load. | Zod-validate on hydrate. |
| B47 | High | stores/orderStore.ts:189-212 | `voidItem` doesn't capture `voidedBy`. | Require user id param. |

## B.12 Dark Mode (recent commit)

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| B48 | Low | components/Sidebar.tsx:83-135 | Sidebar BG hardcoded `#AA0000` — ignores theme. | CSS variable. |
| B49 | Medium | components/ui/Input.tsx | Inputs likely `bg-white text-black` without `dark:` variants. | Add dark variants on every form control. |
| B50 | Low | screens/CashierPOS/SplitBilling.tsx:165 | Modal backdrop hardcoded `bg-black/50`. | Theme-aware. |
| B51 | Low | (forms) | Labels inherit body text; can vanish in dark mode. | `text-neutral-700 dark:text-neutral-200`. |
| B52 | Low | renderer/index.css:58-64 | Dark focus-ring offset assumes neutral-900 BG. | Use transparent or actual BG. |

## B.13 Accessibility

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B53 | Medium | Icon-only buttons (logout, settings) lack `aria-label`. | Add labels. |
| B54 | Medium | Modals don't trap focus / Escape not handled. | Focus-trap util. |
| B55 | High | Table status conveyed by color only. | Add badge text. |
| B56 | Medium | Validation errors not associated with fields (`aria-describedby`). | Wire up. |

## B.14 i18n / Currency

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B57 | Medium | screens/CashierPOS/CheckoutPayment.tsx:257 | `$${amount.toFixed(2)}` instead of `formatCurrency`. | Use hook everywhere. |
| B58 | Low | EU/Asia decimal separators not handled. | `Intl.NumberFormat`. |
| B59 | Low | Dates raw ISO. | `Intl.DateTimeFormat`. |

## B.15 React Query

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B60 | High | screens/TablesScreen.tsx:44-52 | Mutation doesn't invalidate on error. | `onError: invalidateQueries`. |
| B61 | Low | main.tsx:43 | Global staleTime 5 min — menu/inventory stale too long. | 1 min for mutable resources. |
| B62 | Low | screens/AdvancedKitchenScreen.tsx:77 | `enabled` flag flickers — extra fetches. | Explicit loading guard. |

## B.16 Memory Leaks

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B63 | High | screens/CashierPOS/AdvancedCashierPOS.tsx:128-135 | `window.addEventListener` registered on render without cleanup. | Move to `useEffect` with cleanup. |
| B64 | High | services/offlineQueueManager.ts:73-79 | `setInterval` never cleared — duplicates after re-login. | `destroy()` method. |
| B65 | Medium | stores/orderStore.ts:60-69 | `heldOrders` unbounded. | Cap at 50. |

## B.17 Misc / Edge

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| B66 | Low | screens/CashierPOS/AdvancedCashierPOS.tsx:155-164 | sessionStorage `collectPaymentOrderId` not validated. | Validate format; try/catch. |
| B67 | Medium | stores/orderStore.ts:189-212 | Single-click void — no confirm dialog. | Confirm modal. |

---

# PART C — WEB ADMIN DEFECTS (85)

Path: `apps/web-admin/`

## C.1 Root Layout / Auth / API Client

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C1 | **Critical** | app/layout.tsx:94-96 | Inline `dangerouslySetInnerHTML` theme script with no CSP. | Move to `<Script strategy="beforeInteractive">` or external; add CSP. |
| C2 | High | app/layout.tsx:17-23 | `/qr/...` is public-mounted with no rate limit on the page itself. | Edge-rate-limit; CAPTCHA after N hits. |
| C3 | High | app/layout.tsx:42-52 | Auth verification swallows all errors — 401 vs network indistinguishable. | Branch on status; refresh-token before redirect. |
| C4 | Medium | app/layout.tsx:58-63 | Loading spinner has no `role="status"` / `aria-live`. | Add. |
| C5 | **Critical** | app/lib/auth.ts:54 | JWT in `document.cookie` — **not HttpOnly** (impossible from client JS). XSS = full account takeover. | Server must set cookie via `Set-Cookie` with `HttpOnly; Secure; SameSite=Strict`. |
| C6 | High | app/lib/auth.ts:20-35 | Same root cause as C5 — client `document.cookie` cannot be HttpOnly. | Migrate auth flow to server route handler. |
| C7 | Medium | app/lib/auth.ts | User object loaded from localStorage without schema validation. | Zod-validate. |
| C8 | High | app/lib/api.ts:14-22 | API client reads `localStorage.token` but auth layer stores in `auth_token` cookie — token may be missing in fallback. | Single source of truth: cookie via header injection on the server, or unified key. |
| C9 | High | app/lib/api.ts:26-35 | 401 → `window.location.href = '/login'` cancels nothing; in-flight requests can fire after redirect. | Use Next router; abort controllers. |
| C10 | Medium | app/lib/api.ts:8 | `withCredentials: true` blanket — accidental cross-origin would leak cookies. | Lock to known API origin. |

## C.2 Sidebar / Theme

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C11 | Medium | app/components/Sidebar.tsx:146-147 | Hardcoded `#AA0000` BG — ignores dark mode. | CSS var. |
| C12 | Low | app/components/Sidebar.tsx:174-194 | `pathname.startsWith(item.href)` over-matches `/orders-archive` when on `/orders`. | Exact match or `/`-suffix. |
| C13 | Low | app/components/Sidebar.tsx:207 | Theme toggle no focus-visible style. | `focus-visible:ring-2`. |

## C.3 Dashboard

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C14 | High | app/page.tsx:173 | `key={idx}` in low-stock list — reorder breaks reconciliation. | `key={alert.id}`. |
| C15 | Medium | app/page.tsx:81-85 | `newOrders` count in deps → cascading fetches if WS emits dupes. | Debounce or last-fetch-time guard. |
| C16 | Medium | app/page.tsx:158-162 | Error message rendered raw inside `<code>` — server-controlled string into UI. | Escape; show generic. |

## C.4 Login

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C17 | Medium | app/login/page.tsx:64-85 | No `minLength`/`maxLength`/pattern. | Add. |
| C18 | Low | app/login/page.tsx:89-95 | No success toast before redirect — blank flash. | `toast.success`. |
| C19 | Medium | app/login/page.tsx:21-27 | No CSRF token on login POST. | Add. |

## C.5 Menu

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C20 | Medium | app/menu/page.tsx:109-113 | Price has no max / dp limit — `99999999.999`. | `max=999999.99` step=0.01. |
| C21 | Low | app/menu/page.tsx:243-244 | Truncated id with no tooltip. | `title` attr. |
| C22 | Medium | app/menu/page.tsx:196-215 | Tabs overflow on mobile. | `flex-wrap`. |
| C23 | Low | app/menu/page.tsx:131-136 | (Toast already covers this — verify timing.) | Verify. |

## C.6 Orders

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C24 | High | app/orders/page.tsx:66-74 | Page not reset when filter/search changes. | `useEffect` to `setPage(1)`. |
| C25 | Medium | app/orders/page.tsx:141-149 | `key={i}` in stats. | `key={s.label}`. |
| C26 | Medium | app/orders/page.tsx:123 | Refresh icon button no aria-label. | Add. |

## C.7 Kitchen

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C27 | Medium | app/kitchen/page.tsx:65-68 | 15s poll, no failure backoff. | Exponential. |
| C28 | Low | app/kitchen/page.tsx:82 | Station filter empty when no tickets. | Hardcoded list or async fetch. |

## C.8 Inventory

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C29 | Medium | app/inventory/page.tsx:65-92 | No SKU uniqueness / name collision check. | Validate. |
| C30 | Low | app/inventory/page.tsx:55 | `console.error` ships to production. | Strip in prod. |

## C.9 Staff

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C31 | High | app/staff/page.tsx:73 | Password field in React state, lingering in dev tools / heap dumps. | Clear after submit; don't persist. |
| C32 | Medium | app/staff/page.tsx:72,82-86 | Placeholder says "min 8" but submit doesn't enforce. | Validate. |

## C.10 QR Public Page (HIGH RISK — public surface)

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C33 | **Critical** | app/qr/[token]/page.tsx:135-150 | No rate limit on token lookup → enumeration of short tokens. | Edge rate-limit; longer tokens (≥12 chars). |
| C34 | **Critical** | app/qr/[token]/page.tsx:201-231 | Customer name passed unsanitized — backend must defend; no client-side guard. | Pattern-validate; reject HTML chars. |
| C35 | High | app/qr/[token]/page.tsx:203-206 | `name.trim()` checked but spaces-only string still falsy after trim. | `.trim().length > 0`. |
| C36 | Medium | app/qr/[token]/page.tsx:527-539 | `type="tel"` accepts any string — no format validation. | `libphonenumber-js`. |
| C37 | Medium | app/qr/[token]/page.tsx:226-228 | Backend errors surfaced verbatim. | Map to user-friendly. |

## C.11 QR Admin

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C38 | High | app/qr-codes/page.tsx:95-98 | QR contains `window.location.origin` → staging QR codes leak staging URL. | Backend-generated QR with environment-aware base. |
| C39 | Medium | app/qr-codes/page.tsx:82 | Native `confirm()` — inconsistent with design system. | Custom modal. |

## C.12 Settings / Customers / Reports / Delivery Zones / etc.

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C40 | High | app/settings/page.tsx:84-91 | Regex/comment mismatch on key validation. | Reconcile. |
| C41 | Medium | app/settings/page.tsx:68 | Naive deep clone via JSON dance loses Date types. | `structuredClone` / lodash. |
| C42 | Medium | app/customers/page.tsx:78 | Email field accepts any string. | `type="email"` + regex. |
| C43 | Low | app/customers/page.tsx | Search-page reset missing (same as orders). | Fix. |
| C44 | Medium | app/reports/page.tsx:32 | Brittle `parseInt(dateRange.replace('d',''))`. | Enum. |
| C45 | Low | app/reports/page.tsx:60-64 | Failed metrics silent. | Toast on full failure. |
| C46 | Medium | app/delivery-zones/page.tsx:54-60 | Lat/Lng range not validated client-side. | Bounds check. |
| C47 | Medium | app/delivery-zones/page.tsx:86-88 | Missing lat/lng → NaN. | Defensive defaults / validation. |
| C48 | High | app/feature-access/page.tsx | Role filter is client-only; bypassable via localStorage edit. | Backend-enforce on every endpoint. |
| C49 | Medium | app/tables/page.tsx | Status polling possibly too slow. | Verify. |
| C50 | Medium | app/finance/page.tsx, app/tax/page.tsx | Tax/service-charge percentages not range-validated. | 0–100. |
| C51 | Medium | app/staff-schedule/page.tsx | No conflict detection on overlapping shifts. | Validate. |
| C52 | Low | app/attendance/page.tsx | Multi-tab clock state desync. | `storage` events / WS. |
| C53 | Medium | app/external-orders/page.tsx | Import failures silent. | Detailed errors. |
| C54 | Low | app/marketing/page.tsx | Allows past start dates. | `min={today}`; end ≥ start. |
| C55 | Low | app/reviews/page.tsx | Native confirm before delete. | Custom modal. |

## C.13 Global / Cross-Page

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| C56 | High | Many pages have non-responsive grids (e.g., `grid-cols-4` no breakpoints). | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. |
| C57 | High | Hardcoded `bg-gray-50`, `bg-white` etc. without `dark:` variants — many pages partially-dark. | Audit and add. |
| C58 | Medium | Inputs missing `aria-label`/`aria-describedby` linkage. | Fix. |
| C59 | Medium | No debounce on search inputs anywhere. | 300–500ms. |
| C60 | Medium | "Failed to load" with no retry CTA. | Retry button + auto-backoff. |
| C61 | Low | No empty-state illustrations. | Add. |
| C62 | High | Modals don't trap focus. | Focus trap util. |
| C63 | Medium | Errors banner-only, not inline near field. | Inline messages. |

## C.14 WebSocket Hook / CSS / Config

| # | Sev | File:Line | Defect | Fix |
|---|-----|-----------|--------|-----|
| C64 | Medium | app/hooks/useAdminWebSocket.ts:13-31 | Reconnect can race; multiple sockets possible. | State guard. |
| C65 | Low | app/hooks/useAdminWebSocket.ts:34-42 | No error event listener. | Add. |
| C66 | Medium | app/globals.css:141-249 | Heavy `!important` in `.dark` overrides. | Refactor selectors. |
| C67 | Low | app/globals.css:1 | Synchronous Google Fonts import. | `display=swap`; preload. |
| C68 | High | next.config.js:5-7 | `serverActions.allowedOrigins` hardcoded `localhost:3000` — production breaks. | Env-driven. |
| C69 | Medium | next.config.js:10 | `NEXT_PUBLIC_API_URL` defaults to HTTP. | Enforce HTTPS in prod. |

## C.15 Missing Cross-Cutting Pieces

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| C70 | High | No `middleware.ts` at app root — every page does its own client-side auth gate. | Server-side route gate via Next middleware. |
| C71 | High | No `error.tsx` global boundary. | Add. |
| C72 | Medium | No CSRF token implementation. | Issue + verify. |
| C73 | Medium | No CSP headers in `next.config.js`. | Add. |

## C.16 Page-by-page nits (smaller items rolled up)

C74–C85: misc form-validation, label-for, small contrast issues, pagination resets on remaining list pages, console-logs in prod, missing `disabled` on submit during loading, missing `noValidate` on forms with custom validation, hardcoded URLs in docs strings, dead state vars, default sort missing on tables. (Catch-all for remaining items in the underlying audit.)

---

# PART D — CROSS-CUTTING DEFECTS (58)

## D.1 Database Schema (`apps/backend-api/prisma/schema.prisma`)

| # | Sev | Lines | Defect | Fix |
|---|-----|-------|--------|-----|
| **D1** | **Critical** | 35+ fields incl. 93,94,138,179-186,239,266,333-334,469,557-559,605,660,669-671,1162-1163 | **All money fields use `Float`.** Floating-point cannot represent currency. Compounds across orders. | Convert ALL monetary fields to `Decimal @db.Decimal(10,2)`; add migration. |
| D2 | High | 114 | `MenuItem.categoryId` no index. | `@@index([categoryId])`. |
| D3 | High | various | Missing FK indexes (`InventoryItem.supplierId` notably). | Audit & add. |
| D4 | High | 307 | `Table.currentOrderId` `@unique` on nullable + no index. | `@@index([currentOrderId])`. |
| D5 | Medium | various | Inconsistent FK nullability discipline. | Spec & enforce. |
| D6 | High | 442 | `StockAlert` FK is `RESTRICT` → can't delete inventory items with alerts. | `Cascade` for alerts. |
| D7 | Medium | 889-890 | `OrderModificationHistory.modifiedBy` is `Cascade` — deleting a user wipes audit trail. | `Restrict` or `SetNull`. |
| D8 | Medium | (TaxRate) | No unique on `(name, isActive)` → duplicate active tax rates. | `@@unique`. |
| D9 | Medium | (User) | MySQL default collation = case-sensitive username. | Case-insensitive collation. |
| D10 | Medium | various | Order state-vs-timestamp invariants not enforced (`status=COMPLETED` without `completedAt`). | App middleware or DB trigger. |
| D11 | High | (Shift, Expense) | Missing cascade rules; orphan shifts/expenses on user delete. | `Restrict` to preserve history. |

## D.2 Type Safety (Backend ↔ Shared Types)

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D12 | High | `Order.status` is Prisma `String`, TS union — DB allows arbitrary values, breaking client UI. | Convert to Prisma `enum`. |
| D13 | High | `paymentStatus` same drift. | Enum. |
| D14 | Medium | `User.role` String not enum. | Enum. |
| D15 | Medium | `OrderType` is enum (correct). Verify all routes validate. | Verify. |
| D16 | Medium | `InventoryItem.status` String not enum. | Enum. |

## D.3 Shared UI Components (`packages/ui-components/`)

| # | Sev | File | Defect | Fix |
|---|-----|------|--------|-----|
| D17 | High | Button.tsx:35-52 | No `aria-label` fallback; no `aria-busy`. | Add. |
| D18 | High | Modal.tsx:12-58 | No focus trap; no `role="dialog"`/`aria-modal`; focus not restored on close. | Implement focus management; semantic roles. |
| D19 | Medium | Table.tsx:13-37 | No `scope="col"`, no `aria-sort`, no caption. | Add. |
| D20 | Medium | Badge.tsx:14-20 | No dark variants. | Add `dark:` classes. |
| D21 | Medium | Button.tsx:10-15 | No runtime guard on invalid variant — silent fall-through. | Default to 'primary' on unknown. |
| D22 | Low | Card.tsx:13-29 | No focus-visible. | Add. |

## D.4 Real-Time / Socket.IO

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D23 | **Critical** | Backend emits 20+ events; no audit confirms every client subscribes correctly. Stale data inevitable. | Cross-reference emit sites with client `socket.on` registrations; document contract. |
| D24 | High | No payload schema validation. Backend `Order` interface in websocket.ts has 4 fields, real model has ~20. | Use shared types; validate payloads. |
| D25 | High | No state recovery on reconnect — clients miss events while offline. | Sync-request on reconnect with last timestamp. |
| D26 | Medium | server.ts:27-33 | Per-event role enforcement unclear. | Re-validate on each handler. |
| D27 | Medium | websocket.ts:150-161 | Rider-location payload not bounds-checked. | Zod. |

## D.5 Migrations

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D28 | Medium | `20260420073848_init_local` adds `NOT NULL DEFAULT` columns — long lock on big tables. | Two-step: nullable + backfill + NOT NULL. |
| D29 | Medium | No migration tests. | Add migrate-up / migrate-down test harness. |
| D30 | Low | No `@@unique([warehouseId, menuItemId])` on InventoryItem. | Add. |

## D.6 Seed Data (`prisma/seed.ts`)

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D31 | **Critical** | `cashier1/cashier123`, PINs `1234`/`5678` etc. — gated on env var but no production safety net. | Hard-fail if `NODE_ENV=production` regardless of flag. |
| D32 | Medium | Loop creating demo users isn't try/catch wrapped — second run fails on uniqueness. | Catch P2002. |
| D33 | High | No default categories, tax rates, surcharges, chart-of-accounts, default branch — fresh DB unusable. | Seed defaults. |

## D.7 Docker Compose (`docker-compose.yml`)

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D34 | Medium | 18-21 | Healthcheck: 30s default interval, 10 retries → 5 min before unhealthy. | Tighter interval + start_period. |
| D35 | Medium | 63-64 | Named volume but no backup container/strategy. | Add backup service. |
| D36 | Medium | 9-13,30-35 | Secrets in env vars — risky if `.env` is accidentally committed. | Docker secrets. |
| D37 | Low | (all) | No CPU/mem limits. | `deploy.resources`. |

## D.8 Scripts / CI / Tests

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D38 | **Critical** | `auth.routes.test.ts:22-44` and `orderStore.test.ts` are the only test files; `auth` test is `expect(true).toBe(true)` placeholder. | Build a real test suite — target 70% coverage on routes, 100% on payment/calculation/auth. |
| D39 | Medium | No `type-check`, `lint` scripts in `apps/backend-api/package.json`. | Add. |
| D40 | Medium | No husky/lint-staged at root. | Add. |

## D.9 Environment Validation (`config/configValidator.ts`)

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D41 | High | 32-49 | Length + dictionary check, but no entropy check — 32 chars of `aaa...bbb...` passes. | Shannon entropy ≥ 4. |
| D42 | High | 67-78 | DATABASE_URL substring matches but no format parsing. | Full URL parse + validate. |
| D43 | Medium | 94-102 | `CORS_ORIGIN="*"` is a warning, should be a production-blocking error. | Hard fail in prod. |
| D44 | Medium | 115-126 | Stripe key checked only for prefix. | Length + format. |

## D.10 Logging

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D45 | Medium | logger.ts:29-41 | No daily rotation; 25 MB cap by file count. | `winston-daily-rotate-file`. |
| D46 | Medium | logger.ts:4-8 | `sanitize` removes newlines but not ANSI/JSON-breaking quotes. | Stronger filter. |
| D47 | Low | paymentGateway.service.ts:46 | Unstructured log strings. | Structured fields. |

## D.11 Currency / Money

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D48 | **Critical** | shared-types/currency.ts:65-77 | `formatCurrency(amount: number)` — float precision flows in from callers. | Accept `Decimal`, convert internally. |
| D49 | High | shared-types/orderCalculations.ts:65-137 | All math uses `number`; per-item rounding errors compound. | `decimal.js`. |
| D50 | Medium | shared-types/orderCalculations.ts:165-192 | Fixed 0.01 tolerance regardless of split count; negative amounts not blocked. | Scale tolerance; validate ≥ 0. |

## D.12 Date / Timezone

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D51 | Medium | schema.prisma:1038 | `Branch.timezone` exists but display layers don't use it. | `date-fns-tz` formatters per branch. |
| D52 | Medium | schema.prisma:1246-1265 | `QrSession.expiresAt` not auto-checked. | Middleware to expire. |
| D53 | Low | shared-types/dateFormatters.ts:140-165 | `setHours` is local — DST edge cases. | Use UTC variants. |

## D.13 verify-setup.js

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D54 | Medium | 126-252 | Checks `.env.example` only, not `.env`. | Check + parse. |
| D55 | Low | 133-141 | File-size heuristics are weak. | Content checks. |

## D.14 Other

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D56 | Medium | (server.ts) | No request-id middleware → no trace correlation. | UUID middleware. |
| D57 | Low | (server.ts) | `/api/v1` prefix used but no deprecation policy doc. | Document. |
| D58 | Medium | csrfProtection.ts:6-37 | Same item as A141 — fail-open if CORS_ORIGIN unset. | Fail-closed. |

---

# PART E — TOP 25 PRIORITY FIXES (Across All Apps)

These are the items to fix **before any production deployment**.

| Rank | Ref | Item |
|------|-----|------|
| 1 | A21, A52 | **Add Stripe webhook route + signature verification** — currently lost |
| 2 | A16, A26 | **Refunds don't call Stripe** — customers never reimbursed |
| 3 | D1, A65, A66, A67 | **Convert all money fields from `Float` to `Decimal`** |
| 4 | A15 | Refund cap allows over-refund of overpaid orders |
| 5 | C5, C6 | JWT cookie not HttpOnly — XSS = account takeover |
| 6 | A48 | JWT signature verify missing `iss` claim |
| 7 | A10 | Inventory deduction partial-failure not handled |
| 8 | A35 | Delivery zones store invalid polygons silently |
| 9 | A9, A47 | Order/expense numbers race-create duplicates |
| 10 | B12 | Tax/discount math order is wrong in cashier |
| 11 | B15, B16 | Double-submit + payment-after-create-fail in checkout |
| 12 | B38 | Offline queue can double-charge on retry |
| 13 | C33, C34 | Public QR page — no rate limit, no input sanitization |
| 14 | A43 | Discount `usageLimit` not enforced |
| 15 | D31 | Demo users are seedable in production via env flag |
| 16 | A22 | Stripe metadata leaks PII (`username`) |
| 17 | A41 | Cash-drawer discrepancies not flagged |
| 18 | C70, C71 | Web admin missing server-side auth middleware + global error boundary |
| 19 | B23 | Concurrent table assignment race |
| 20 | B7 | Token expiry mid-order entry destroys checkout |
| 21 | C48 | Feature-access RBAC client-only — backend not enforcing |
| 22 | D38 | Test suite is essentially empty |
| 23 | D23, D24, B40 | WebSocket: no payload contracts, no rejoin on reconnect, no audit of subscribers |
| 24 | C57, B49 | Dark mode incomplete — many surfaces unstyled |
| 25 | D11, D7 | Cascading deletes can wipe audit trail / orphan financial records |

---

# PART F — RECOMMENDED REMEDIATION PHASES

**Phase 0 (Stop-the-bleed, 1 week)**
- Items 1–10 from Part E. Refunds, money types, auth integrity, order numbering, polygon validation, partial-failure handling.

**Phase 1 (Pre-release hardening, 2 weeks)**
- Items 11–20. Cashier math, offline-queue safety, public QR hardening, RBAC server-enforcement, default-data seeding.

**Phase 2 (Quality / Coverage, 4 weeks)**
- Items 21–25 + all High items not in top 25. Build the test suite (target: 70% line coverage on routes, 100% on payment / order-calc / auth). Add integration tests for cron and WebSocket flows.

**Phase 3 (Polish, ongoing)**
- All Medium items: dark-mode completeness, accessibility, i18n, dev-experience (lint, husky, pre-commit), logging structuring, observability (request IDs, structured logs, Sentry).

**Phase 4 (Pre-prod operational)**
- Manual QA matrix from §0. Hardware integration tests. Load tests. Penetration test. Backup/restore drill. Compliance review.

---

# APPENDIX — Quick Stats

- **Total findings:** 297
- **Critical:** 47 (16%)
- **High:** 72 (24%)
- **Medium:** 138 (47%)
- **Low:** 40 (13%)
- **Files reviewed:** 38 backend routes + 29 desktop screens + 25 web admin pages + shared packages + DB schema + migrations + Docker + verify script + 2 test files
- **Estimated effort to clear Critical + High:** 6–8 engineering weeks for a 3-person team
- **Recommended pre-prod state:** All Critical fixed, ≥ 90% of High fixed, test suite at 70% coverage, manual QA matrix executed.

— End of report —
