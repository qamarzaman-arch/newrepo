# PROJECT_CONTEXT.md — Restaurant POS System (POSLytic)

> Use this document when debugging, onboarding, or adding features. It covers architecture, all files, environment variables, database models, API routes, security decisions, and known patterns.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Tech Stack](#3-tech-stack)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Backend API](#6-backend-api)
7. [POS Desktop (Electron)](#7-pos-desktop-electron)
8. [Web Admin (Next.js)](#8-web-admin-nextjs)
9. [Shared Packages](#9-shared-packages)
10. [Security Architecture](#10-security-architecture)
11. [Real-Time (Socket.IO)](#11-real-time-socketio)
12. [Offline-First Architecture](#12-offline-first-architecture)
13. [Authentication Flow](#13-authentication-flow)
14. [Common Patterns & Conventions](#14-common-patterns--conventions)
15. [Fixed Issues Reference](#15-fixed-issues-reference)
15a. [Button / Functionality Audit (April 2026)](#15a-button--functionality-audit-april-2026)
16. [Debugging Guide](#16-debugging-guide)

---

## 1. Project Overview

**Name:** restaurant-pos-system (brand: POSLytic)  
**Version:** 1.0.0  
**Node:** >=20.0.0 | npm >=10.0.0  
**Type:** Monorepo with npm workspaces

### What it is

A full-stack restaurant management system with three apps sharing one backend:

| App | Purpose | Tech |
|-----|---------|------|
| `apps/backend-api` | REST API + WebSocket server | Express + Prisma + MySQL + Socket.IO |
| `apps/pos-desktop` | Cashier/kitchen/admin desktop app | Electron + React + Vite + SQLite |
| `apps/web-admin` | Admin dashboard (browser) | Next.js 16 |

### Key capabilities
- Dine-in, walk-in, takeaway, delivery, pickup, reservation order types
- Offline-first order capture with server sync queue
- Kitchen display with KOT (Kitchen Order Ticket) system
- Delivery management with rider assignment and tracking
- Inventory + recipe management with stock auto-deduction
- Staff shifts, schedules, commissions, performance
- Stripe payment integration
- Role-based access for ADMIN, MANAGER, CASHIER, SERVER, STAFF, KITCHEN, RIDER

---

## 2. Monorepo Structure

```
root/
├── apps/
│   ├── backend-api/              # Express REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema (MySQL)
│   │   │   ├── migrations/       # 7 migration files (Apr 18–29, 2026)
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── server.ts         # App entry point
│   │       ├── config/
│   │       │   ├── constants.ts  # PIN_BCRYPT_ROUNDS, etc.
│   │       │   ├── kitchenConfig.ts  # Kitchen station/priority maps
│   │       │   └── index.ts      # Env validation
│   │       ├── middleware/
│   │       │   ├── auth.ts       # JWT verify + role check
│   │       │   ├── csrfProtection.ts  # Origin/Referer validation
│   │       │   ├── errorHandler.ts    # Global error handler
│   │       │   └── rateLimiter.ts     # General + auth-specific limiters
│   │       ├── routes/           # 38 route files (see §6)
│   │       ├── services/
│   │       │   ├── commission.service.ts
│   │       │   ├── loyalty.service.ts
│   │       │   └── paymentGateway.service.ts
│   │       ├── jobs/
│   │       │   └── sessionCleanup.ts  # Session + audit + table lock cleanup
│   │       └── utils/
│   │           ├── logger.ts
│   │           ├── pagination.ts      # parsePagination() helper
│   │           ├── security.ts
│   │           └── websocket.ts       # WebSocketManager
│   │
│   ├── pos-desktop/
│   │   └── src/
│   │       ├── main/
│   │       │   ├── index.ts          # Electron main process + IPC handlers
│   │       │   └── hardware-handlers.ts
│   │       ├── preload/
│   │       │   └── index.ts          # contextBridge API exposure
│   │       └── renderer/
│   │           ├── main.tsx
│   │           ├── App.tsx
│   │           ├── screens/          # 29 screen components (see §7)
│   │           ├── hooks/            # 15 custom hooks (see §7)
│   │           ├── services/         # 33 service files (see §7)
│   │           ├── stores/           # 4 Zustand stores (see §7)
│   │           ├── components/
│   │           │   └── EnhancedErrorBoundary.tsx
│   │           └── layouts/
│   │               ├── AdminLayout.tsx
│   │               ├── CashierLayout.tsx
│   │               └── KitchenLayout.tsx
│   │
│   └── web-admin/
│       └── app/                      # Next.js App Router (25 pages)
│           ├── layout.tsx            # Root layout + auth gate
│           ├── page.tsx              # Dashboard home
│           ├── middleware.ts         # Route protection + role RBAC
│           ├── components/
│           │   └── Sidebar.tsx
│           ├── hooks/
│           │   └── useAdminWebSocket.ts
│           ├── lib/
│           │   ├── api.ts            # Axios client
│           │   ├── auth.ts           # Cookie-based auth helpers
│           │   └── currency.ts
│           ├── attendance/page.tsx
│           ├── branches/page.tsx
│           ├── customers/page.tsx
│           ├── delivery-zones/page.tsx
│           ├── external-orders/page.tsx
│           ├── feature-access/page.tsx
│           ├── finance/page.tsx
│           ├── inventory/page.tsx
│           ├── kitchen/page.tsx
│           ├── login/page.tsx
│           ├── marketing/page.tsx
│           ├── menu/page.tsx
│           ├── orders/page.tsx
│           ├── purchase-orders/page.tsx
│           ├── qr-codes/page.tsx
│           ├── qr/[token]/page.tsx   # Public QR-ordering customer page
│           ├── recipes/page.tsx
│           ├── reports/page.tsx
│           ├── reviews/page.tsx
│           ├── settings/page.tsx
│           ├── staff/page.tsx
│           ├── staff-schedule/page.tsx
│           ├── tables/page.tsx
│           └── tax/page.tsx
│
└── packages/
    ├── shared-types/src/
    │   ├── index.ts          # All shared types + re-exports
    │   ├── constants.ts      # STORAGE_KEYS, APP_CONFIG, etc.
    │   ├── currency.ts
    │   ├── dateFormatters.ts
    │   ├── orderCalculations.ts
    │   └── statusColors.ts
    └── ui-components/src/
        ├── Badge.tsx
        ├── Button.tsx
        ├── Card.tsx
        ├── Modal.tsx
        └── Table.tsx
```

### Root scripts

```bash
npm run dev          # backend + pos-desktop
npm run dev:api      # backend only
npm run dev:pos      # pos-desktop only
npm run dev:web      # web-admin only
npm run dev:all      # all three apps
npm run build        # build all
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
npm run db:seed      # seed database
```

---

## 3. Tech Stack

### Backend API (`apps/backend-api`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| @prisma/client | 5.22.0 | ORM |
| socket.io | ^4.6.1 | WebSocket server |
| jsonwebtoken | ^9.0.2 | JWT auth |
| bcryptjs | ^2.4.3 | Password/PIN hashing |
| stripe | ^17.7.0 | Payments |
| helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.1.5 | Rate limiting |
| cors | ^2.8.5 | CORS |
| compression | ^1.7.4 | Response compression |
| zod | ^3.22.4 | Validation |
| winston | ^3.11.0 | Logging |
| node-cron | ^3.0.3 | Scheduled jobs |
| xss | ^1.0.15 | XSS sanitization |
| uuid | ^9.0.1 | ID generation |

### POS Desktop (`apps/pos-desktop`)

| Package | Version | Purpose |
|---------|---------|---------|
| electron | ^41.2.1 | Desktop shell |
| react | ^18.2.0 | UI |
| vite | ^8.0.8 | Build tool |
| zustand | ^4.4.7 | State management |
| @tanstack/react-query | ^5.17.9 | Server state / caching |
| @tanstack/react-table | ^8.11.6 | Tables |
| socket.io-client | ^4.6.1 | WebSocket client |
| axios | ^1.6.5 | HTTP (timeout: 30s) |
| better-sqlite3 | ^12.9.0 | Local offline DB |
| electron-store | ^8.2.0 | Persistent config |
| tailwindcss | ^3.4.1 | Styling |
| framer-motion | ^10.18.0 | Animations |
| react-hot-toast | ^2.4.1 | Notifications |
| recharts | ^2.10.3 | Charts |
| date-fns | ^3.2.0 | Date utilities |

### Web Admin (`apps/web-admin`)

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^16.2.4 | React framework |
| react | ^18.2.0 | UI |
| @tanstack/react-query | ^5.17.9 | Data fetching |
| axios | ^1.6.5 | HTTP client |
| tailwindcss | ^3.4.1 | Styling |
| framer-motion | ^10.18.0 | Animations |
| lucide-react | ^0.309.0 | Icons |

---

## 4. Environment Variables

### Backend API (`apps/backend-api/.env`)

```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="mysql://root:PASSWORD@127.0.0.1:3306/restaurant_pos"

# Auth
JWT_SECRET="min-32-char-random-string"
JWT_EXPIRES_IN="24h"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payments
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional
SMS_API_KEY=
PAYPAL_CLIENT_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=us-east-1
```

### POS Desktop (`apps/pos-desktop/.env`)

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001
VITE_DEBUG=false
VITE_APP_VERSION=1.0.0
```

### Web Admin (`apps/web-admin/.env`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_APP_NAME=POSLytic Admin
```

---

## 5. Database Schema

**Database:** MySQL | **ORM:** Prisma 5.22.0

### Enums

```prisma
enum OrderType {
  DINE_IN | WALK_IN | TAKEAWAY | DELIVERY | PICKUP | RESERVATION
}
```

### All Models (47)

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **User** | id, username, email, passwordHash, fullName, role, pin, isActive, lastLoginAt | Rider fields: lastLocationLat/Lng, vehicleType, vehiclePlate |
| **Session** | id, userId, token, expiresAt, ipAddress | Cleaned up by cron when expiresAt < now() |
| **MenuCategory** | id, name, description, displayOrder, isActive | |
| **MenuItem** | id, categoryId, name, price, cost, image, sku, barcode, isActive, isAvailable, prepTimeMinutes, taxRate | |
| **ItemModifier** | id, menuItemId, name, required, multiSelect | |
| **ModifierOption** | id, modifierId, name, priceAdjustment | |
| **MenuItemTag** | id, menuItemId, tag | |
| **Order** | id, orderNumber (unique), orderType, status, customerId, tableId, subtotal, discountAmount, taxAmount, surchargeAmount, tipAmount, totalAmount, paidAmount, paymentMethod, paymentStatus, cashierId, serverId, orderedAt, completedAt | |
| **OrderItem** | id, orderId, menuItemId, quantity, unitPrice, totalPrice, notes, modifiers, status, sentToKitchenAt, preparedAt | |
| **Payment** | id, orderId, method, amount, reference, status, paidAt | |
| **PaymentValidation** | id, orderId, gateway, intentId, status, amount | Audit log for Stripe intents |
| **Table** | id, number, capacity, status, location, shape, posX, posY, width, height, currentOrderId | |
| **Customer** | id, firstName, lastName, email, phone (unique), loyaltyPoints, totalOrders, totalSpent, lastVisitAt | |
| **LoyaltyTransaction** | id, customerId, orderId, type, points, balance, description | |
| **InventoryItem** | id, name, sku, barcode, currentStock, minStock, maxStock, unit, costPerUnit, supplierId, warehouseId, status | |
| **StockMovement** | id, inventoryItemId, type, quantity, previousStock, currentStock, orderId, reason, notes | Audit trail |
| **StockAlert** | id, inventoryItemId, type, threshold, isActive | |
| **StockAdjustment** | id, inventoryItemId, adjustmentType, quantity, reason, adjustedById | |
| **Warehouse** | id, name, location, isDefault | |
| **KotTicket** | id, ticketNumber (unique), orderId, orderItemId, course, status, priority, station, orderedAt, startedAt, completedAt | Kitchen display tickets |
| **Delivery** | id, orderId (unique), deliveryNumber (unique), customerName, customerPhone, deliveryAddress, lat/lng, riderId, estimatedTime, status, deliveryFee | |
| **DeliveryZone** | id, name, polygon, radius, minOrderAmount, deliveryFee, estimatedTime, isActive | |
| **Expense** | id, category, amount, description, receiptUrl, paidById, approvedById, status | |
| **Discount** | id, name, code (unique), type, value, minValue, maxValue, usageLimit, usedCount, validFrom, validUntil | |
| **Surcharge** | id, name, type, value, isAutoApplied, orderTypes | |
| **TaxRate** | id, name, rate, isDefault, appliesTo | |
| **CashDrawer** | id, sessionNumber (unique), openedById, closedById, openingBalance, closingBalance, expectedBalance, discrepancy, totalSales, totalCashIn, totalCashOut | |
| **Shift** | id, userId, shiftNumber (unique), clockedInAt, clockedOutAt, scheduledStart, scheduledEnd, status | |
| **StaffPerformance** | id, userId, date, ordersHandled, totalSales, totalCommission, avgOrderValue, tips, cancellations | |
| **Vendor** | id, name, contactName, email, phone, address, paymentTerms, isActive | |
| **Setting** | id, key (unique), value, category, description | Key-value config store |
| **Device** | id, name, type, serialNumber, ipAddress, macAddress, config, isActive | POS terminals, printers |
| **OrderCounter** | id, date (unique), count | Daily order numbering |
| **TableLock** | id, tableId (unique), lockedById, expiresAt | Cleaned up by cron when expiresAt < now() |
| **IdempotencyKey** | id, key (unique), requestPath, requestBody, responseBody, orderId, expiresAt | Prevent duplicate requests |
| **SyncQueue** | id, operation, modelName, recordId, payload, status, retryCount, errorMessage | Offline sync queue |
| **SyncLog** | id, deviceId, syncType, status, recordsProcessed, errors | |
| **AuditLog** | id, userId, action, entity, entityId, changes, ipAddress, createdAt | Cleaned up by cron |
| **OrderModificationHistory** | id, orderId, modifiedById, reason, changes | |
| **ReportCache** | id, reportType, parameters, data, generatedAt, expiresAt | |
| **Combo** | id, name, description, price, isActive | Combo meals |
| **ComboItem** | id, comboId, menuItemId, quantity | |
| **Recipe** | id, name, description, menuItemId, prepTimeMinutes, cookTimeMinutes, servings, cost, isActive | |
| **RecipeIngredient** | id, recipeId, inventoryItemId, quantity, unit | |
| **PurchaseOrder** | id, poNumber (unique), vendorId, status, totalAmount, notes, orderedAt, receivedAt | |
| **PurchaseOrderItem** | id, purchaseOrderId, inventoryItemId, description, quantity, unitPrice, totalPrice | |
| **FeatureAccess** | id, feature (unique), roles, isEnabled | Role-based feature flags |

---

## 6. Backend API

### Server (`src/server.ts`)
- **Port:** 3001
- **Base path:** `/api/v1`
- **Health check:** `GET /health`

### Middleware order (applied globally)

```
1. helmet()              → Security headers (CSP disabled for Electron compat)
2. cors()                → Origin validation from CORS_ORIGIN env
3. compression()         → gzip responses
4. csrfProtection        → Rejects POST/PUT/PATCH/DELETE from unknown Origins
5. express.raw()         → Raw body for Stripe webhooks only
6. express.json()        → JSON parsing (10mb limit)
7. express.urlencoded()  → Form data
8. rateLimiter           → 100 req/15min on /api/
9. authLimiter           → 5 req/15min on /auth/login and /auth/validate-pin
```

### All Route Files (`src/routes/`)

| File | Key Endpoints |
|------|--------------|
| `auth.routes.ts` | POST /login, POST /logout, POST /register, POST /validate-pin (own user only) |
| `order.routes.ts` | CRUD orders, status transitions, refunds, kitchen actions |
| `payment.routes.ts` | Create payment, Stripe intent, webhook, refund |
| `menu.routes.ts` | Categories + items CRUD, availability toggle |
| `inventory.routes.ts` | Items CRUD, stock adjustments, low-stock query |
| `kitchen.routes.ts` | KOT tickets list, status updates, dispatch |
| `staff.routes.ts` | Staff CRUD, shift management, PIN management |
| `delivery.routes.ts` | Delivery CRUD, rider assignment, status tracking |
| `delivery-zone.routes.ts` | Zones CRUD |
| `customer.routes.ts` | Customer CRUD, loyalty points |
| `table.routes.ts` | Tables CRUD, status management |
| `table-lock.routes.ts` | Lock/unlock table for concurrent access |
| `cash-drawer.routes.ts` | Open/close sessions, transactions |
| `discount.routes.ts` | Promo codes CRUD, validation |
| `expense.routes.ts` | Expense tracking |
| `report.routes.ts` | Sales, staff, inventory reports |
| `user.routes.ts` | User profile, password/PIN change |
| `audit-log.routes.ts` | Activity log queries |
| `sync.routes.ts` | Offline sync endpoints |
| `feature-access.routes.ts` | Feature flag management |
| `vendor.routes.ts` | Vendor/supplier management |
| `purchase-order.routes.ts` | Purchase order lifecycle |
| `recipe.routes.ts` | Recipe management |
| `combo.routes.ts` | Combo meal management |
| `setting.routes.ts` | Key-value settings |
| `device.routes.ts` | Device registration |
| `rider.routes.ts` | Rider location, available riders |
| `commission.routes.ts` | Staff commission tracking |
| `staff-schedule.routes.ts` | Schedule CRUD |
| `order-modification.routes.ts` | Audit trail for order changes |
| `branch.routes.ts` | Multi-branch management |
| `marketing.routes.ts` | Email/SMS campaign CRUD + send |
| `review.routes.ts` | Customer reviews + reply/hide moderation |
| `accounting.routes.ts` | Chart of accounts, P&L, balance sheet, journal entries |
| `tax.routes.ts` | Tax submissions + retry |
| `external-platform.routes.ts` | Aggregator orders (Uber/DoorDash-style) accept/reject |
| `qr-ordering.routes.ts` | Public QR ordering sessions, menu, place/track order |
| `index.ts` | Router composition (mounts all 38 routers under `/api/v1`) |

### Cron Jobs (`src/jobs/sessionCleanup.ts`)

| Job | Schedule | Action |
|-----|----------|--------|
| Session cleanup | Every hour | DELETE sessions WHERE expiresAt < now() |
| Audit log cleanup | Daily at midnight | DELETE audit logs older than 90 days |
| Table lock cleanup | Every 15 min | DELETE table locks WHERE expiresAt < now() |

### Config files
- `src/config/constants.ts` — `PIN_BCRYPT_ROUNDS = 12` (used everywhere PIN is hashed)
- `src/config/kitchenConfig.ts` — `KITCHEN_PRIORITY_MAP`, `KITCHEN_STATION_MAP`, `DEFAULT_KITCHEN_STATION`, `DEFAULT_KITCHEN_PRIORITY`
- `src/utils/pagination.ts` — `parsePagination(query)`: clamps page ≥ 1, limit 1–200

---

## 7. POS Desktop (Electron)

### Electron Setup (`src/main/index.ts`)

**Window:** 1280×720 min, 1920×1080 max, maximized on launch  
**Security:** `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`  
**DB path:** `{userData}/pos-local.db` (SQLite, WAL mode)

**IPC Handlers:**

| Channel | Description | Restrictions |
|---------|-------------|-------------|
| `db-query` | SQLite SELECT queries | SELECT only; rejects INSERT/UPDATE/DELETE/DROP/CREATE/ALTER/ATTACH |
| `store-get` | electron-store read | — |
| `store-set` | electron-store write | — |
| `get-app-info` | Version, platform info | — |
| `secure-set-item` | Encrypt + store via safeStorage | — |
| `secure-get-item` | Decrypt + retrieve | — |
| `secure-remove-item` | Delete encrypted value | — |
| Hardware handlers | Printer, cash drawer, scanner | Registered via setupHardwareHandlers() |

**CSP Headers (injected via webRequest):**
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*
```

**Local SQLite Tables:**
- `orders` — offline order queue
- `order_items` — offline order line items
- `payments` — offline payment records
- `sync_metadata` — sync state

### All Screens (`src/renderer/screens/`)

| Screen | Role |
|--------|------|
| LoginScreen | All users |
| AdminDashboard | Admin/Manager |
| AdvancedCashierPOS | Cashier |
| EnhancedMenuOrdering | Cashier ordering flow |
| OrderTypeSelection | Cashier |
| TableCustomerSelection | Cashier |
| CheckoutPayment | Cashier |
| SplitBilling | Cashier |
| OrderSuccess | Cashier |
| CashierActiveOrders | Cashier |
| CashierOrderHistory | Cashier |
| AdvancedKitchenScreen | Kitchen |
| KitchenDispatchConfirmation | Kitchen |
| DeliveryManagementScreen | Manager/Rider |
| TablesScreen | Cashier/Server |
| AdvancedCustomersScreen | Cashier/Manager |
| AdvancedMenuScreen | Manager/Admin |
| AdvancedInventoryScreen | Manager/Admin |
| AdvancedStaffScreen | Manager/Admin |
| AdvancedOrdersScreen | Manager/Admin |
| AdvancedSettingsScreen | Admin |
| FeatureAccessScreen | Admin |
| FinancialManagementScreen | Manager/Admin |
| VendorsScreen | Manager/Admin |
| AttendanceScreen | Manager/Admin |
| ShiftSummary | Cashier |
| ReservationDetails | Cashier/Server |
| OrderCard | Shared component |

### All Hooks (`src/renderer/hooks/`)

| Hook | Purpose |
|------|---------|
| `useWebSocket` | Socket.IO connection, subscribe/unsubscribe, room joining |
| `useMenu` | Menu categories + items (React Query) |
| `useOrders` | Order CRUD + status transitions |
| `useCustomers` | Customer search + loyalty |
| `useTables` | Table status + locking |
| `useInventory` | Stock levels + adjustments |
| `useStaff` | Staff + shift management |
| `useStaffSchedule` | Schedule queries |
| `useDelivery` | Delivery + rider tracking |
| `useRider` | Rider location + availability |
| `useLoyalty` | Points earn/redeem |
| `useOrderModification` | Order change history |
| `useAuditLogs` | Activity log queries |
| `useCurrency` | Formatted currency display |

### All Services (`src/renderer/services/`)

| Service | Purpose |
|---------|---------|
| `api.ts` | Axios instance (base URL, auth header, 401 logout+redirect, 30s timeout) |
| `authService.ts` | Login, logout, verify token |
| `secureStorageService.ts` | Encrypted storage via Electron safeStorage (throws if electronAPI unavailable — no localStorage fallback) |
| `offlineQueueManager.ts` | Queue orders when offline, sync when reconnected |
| `syncConflictResolver.ts` | Handle server/client conflicts on sync |
| `orderService.ts` | Order CRUD API calls |
| `paymentGatewayService.ts` | Stripe integration |
| `paymentValidationService.ts` | Payment audit |
| `menuService.ts` | Menu API calls |
| `inventoryService.ts` | Inventory API calls |
| `staffService.ts` | Staff API calls |
| `staffScheduleService.ts` | Schedule API calls |
| `customerService.ts` | Customer API calls |
| `deliveryService.ts` | Delivery API calls |
| `deliveryZoneService.ts` | Zone API calls |
| `riderService.ts` | Rider API calls |
| `kitchenService.ts` | KOT API calls |
| `loyaltyService.ts` | Loyalty points API calls |
| `reportService.ts` | Report API calls |
| `expenseService.ts` | Expense API calls |
| `featureAccessService.ts` | Feature flag API calls |
| `settingsService.ts` | Settings API calls |
| `auditLogService.ts` | Audit log API calls |
| `tableLockService.ts` | Table lock API calls |
| `orderModificationService.ts` | Order modification API calls |
| `hardwareManager.ts` | Printer, cash drawer, scanner IPC coordination |
| `thermalPrinter.ts` | Receipt printing |
| `barcodeScannerService.ts` | Barcode scan events |
| `cashDrawerService.ts` | Cash drawer open/close via hardware |
| `keyboardShortcutsManager.ts` | Global hotkey registration |
| `validationService.ts` | Client-side input validation helpers |

### All Stores (`src/renderer/stores/`)

| Store | State |
|-------|-------|
| `authStore.ts` | user, token, isAuthenticated, login(), logout() — persisted to localStorage (cleared on logout) |
| `orderStore.ts` | currentOrder, heldOrders, addItem(), removeItem(), applyDiscount(), getSubtotal(), resumeOrder() (sets pricesUnvalidated=true), cleanupExpiredHeldOrders() (UTC comparison) |
| `featureAccessStore.ts` | features[], hasAccess() — returns false by default (deny-first) |
| `settingsStore.ts` | settings key-value, fetchSettings(), getSetting() |

---

## 8. Web Admin (Next.js)

### Auth Pattern

- Tokens stored in **cookie** named `auth_token` (SameSite=Strict, Path=/)
- `app/lib/auth.ts` — `setAuth()`, `getToken()`, `getUser()`, `clearAuth()`, `isAuthenticated()`
- `app/middleware.ts` — reads `auth_token` cookie; protects all routes except `/login`; enforces role check: `/staff` and `/reports` require ADMIN or MANAGER role

### All Pages (25)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Dashboard: order summary, staff count, low stock, top items, live WebSocket feed |
| `/login` | `app/login/page.tsx` | Login form |
| `/menu` | `app/menu/page.tsx` | Menu items CRUD with price validation (price must be > 0) |
| `/inventory` | `app/inventory/page.tsx` | Stock levels, adjustments |
| `/staff` | `app/staff/page.tsx` | Staff management (admin-only route) |
| `/staff-schedule` | `app/staff-schedule/page.tsx` | Weekly schedule view + swap requests |
| `/delivery-zones` | `app/delivery-zones/page.tsx` | Zone management with working Edit + Create + Delete |
| `/purchase-orders` | `app/purchase-orders/page.tsx` | PO creation with item rows (description, qty, unit price) |
| `/recipes` | `app/recipes/page.tsx` | Recipe management |
| `/reports` | `app/reports/page.tsx` | Sales + staff reports + CSV export (admin-only route) |
| `/orders` | `app/orders/page.tsx` | Orders list, status updates, summary panel |
| `/customers` | `app/customers/page.tsx` | Customer CRUD + loyalty tier viewer |
| `/tables` | `app/tables/page.tsx` | Tables CRUD + status updates |
| `/kitchen` | `app/kitchen/page.tsx` | KOT board with 15s auto-refresh + status transitions |
| `/attendance` | `app/attendance/page.tsx` | Clock-in/clock-out shifts |
| `/feature-access` | `app/feature-access/page.tsx` | Role × feature matrix toggle + reset defaults |
| `/settings` | `app/settings/page.tsx` | Key-value settings bulk edit |
| `/branches` | `app/branches/page.tsx` | Multi-branch CRUD + active toggle |
| `/finance` | `app/finance/page.tsx` | P&L, Balance Sheet, Journal Entries (with void) |
| `/marketing` | `app/marketing/page.tsx` | Campaign CRUD + send |
| `/reviews` | `app/reviews/page.tsx` | Reviews list, reply, hide |
| `/tax` | `app/tax/page.tsx` | Tax submission + retry |
| `/external-orders` | `app/external-orders/page.tsx` | Aggregator orders accept/reject (30s auto-refresh) |
| `/qr-codes` | `app/qr-codes/page.tsx` | Generate / expire / print QR ordering sessions |
| `/qr/[token]` | `app/qr/[token]/page.tsx` | Public customer QR ordering page (uses `publicApi`, no auth required) |

### Key Components

- `app/components/Sidebar.tsx` — Navigation filtered by role (client-side UX only; real enforcement is in middleware)
- `app/hooks/useAdminWebSocket.ts` — Socket.IO connection with guard against duplicate connections and proper cleanup
- `app/lib/api.ts` — Axios with auth cookie, 401 → redirect to /login

### Dashboard data loading (`app/page.tsx`)
Uses `Promise.allSettled()` for parallel fetch. Each metric has its own error flag (`reportError`, `staffCountError`, `lowStockError`, `topItemsError`). Failed metrics show `—` + amber warning icon. New order WebSocket events trigger a full dashboard refresh.

---

## 9. Shared Packages

### `packages/shared-types`

**UserRole:** `'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVER' | 'STAFF' | 'KITCHEN' | 'RIDER'`

**OrderType:** `'DINE_IN' | 'WALK_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | 'RESERVATION'`

**OrderStatus:** `'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'`

**PaymentStatus:** `'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED'`

**PaymentMethod:** `'CASH' | 'CARD' | 'ONLINE_TRANSFER' | 'WALLET'`

**Key interfaces:**
- `OrderItem` — id, menuItemId, name, price, quantity, notes, modifiers, voided
- `Order` — id, orderNumber, orderType, status, customer, table, items, pricing breakdown, payment, cashier, server
- `MenuItem` — id, name, description, price, cost, categoryId, isAvailable, isActive
- `InventoryItem` — id, name, sku, currentStock, minStock, maxStock, unit, costPerUnit, status
- `ApiResponse<T>` — success, data, error
- `PaginatedResponse<T>` — items, total, page, limit, totalPages

**Constants (`constants.ts`):**
- `STORAGE_KEYS.AUTH_TOKEN = 'auth_token'` — cookie/storage key used by web-admin auth
- `APP_CONFIG` — app name, version, API version

### `packages/ui-components`
Exports: `Badge`, `Button`, `Card`, `Modal`, `Table`  
Build: CommonJS + ESM via tsup  
Peer deps: react >=18, react-dom >=18

---

## 10. Security Architecture

### Authentication
- JWT signed with `JWT_SECRET` (min 32 chars)
- Tokens expire per `JWT_EXPIRES_IN` env var
- Sessions stored in DB (`Session` model) — cleaned up by cron when `expiresAt < now()`
- POS Desktop: tokens stored via Electron `safeStorage` (encrypted). No localStorage fallback.
- Web Admin: tokens stored in `SameSite=Strict` cookie named `auth_token`

### PIN Security
- All PINs hashed with bcrypt at cost factor **12** (`PIN_BCRYPT_ROUNDS` constant)
- PIN validation only checks the **requesting user's own PIN** — no cross-user comparison
- Per-userId rate limit: max 10 PIN attempts per 15 minutes

### CSRF Protection
- Middleware (`src/middleware/csrfProtection.ts`) validates `Origin` / `Referer` header on state-changing requests (POST/PUT/PATCH/DELETE)
- Rejects requests from origins not in `CORS_ORIGIN` env var

### Rate Limiting
- General: 100 req/15min on `/api/`
- Auth endpoints: 5 req/15min on `/auth/login` and `/auth/validate-pin`

### Input Validation
- Search params: trimmed + max 100 chars before Prisma
- Pagination: `parsePagination()` clamps page ≥ 1, limit 1–200
- Menu prices: validated > 0 before submission (web-admin)
- PIN entry: validated as `/^\d{4}$/` before API call (pos-desktop)

### Electron Security
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- CSP headers injected via `webRequest.onHeadersReceived`
- IPC `db-query` allows SELECT only (INSERT/UPDATE/DELETE/DROP/CREATE/ALTER/ATTACH blocked)
- `secureStorageService` throws if `electronAPI` is not available (no silent localStorage downgrade)

### Feature Access
- `featureAccessStore.hasAccess()` returns **false** by default (deny-first)
- Server-side feature flags via `FeatureAccess` model
- Route-level role check in Next.js middleware for admin-only pages

---

## 11. Real-Time (Socket.IO)

### Server setup
- Port: same as HTTP (3001)
- CORS: from `CORS_ORIGIN` env
- Auth: JWT from `handshake.auth.token` or `handshake.query.token`

### Room access matrix

| Room | Allowed Roles |
|------|--------------|
| `admin`, `analytics`, `reports`, `manager` | ADMIN, MANAGER |
| `kitchen`, `kot` | KITCHEN, ADMIN, MANAGER |
| `orders`, `cashier`, `payments` | CASHIER, ADMIN, MANAGER |
| `delivery` | RIDER, ADMIN, MANAGER |

Unauthorized join attempts emit `room-access-denied` to the requesting socket.

### Events (server → client)
- `new-order` — new order created
- `order-updated` — order status change
- `kot-ticket` — new kitchen ticket
- `kot-updated` — ticket status change
- `table-status` — table state change
- `rider-location` — rider GPS update
- `inventory-alert` — low stock warning
- `payment-received` — payment confirmation

### Client usage (pos-desktop)
```typescript
const { isConnected, subscribe, joinRoom } = useWebSocket();
// subscribe returns cleanup unsubscribe fn
const unsub = subscribe('new-order', (data) => { ... });
```

---

## 12. Offline-First Architecture

### How it works

1. Orders are created in local SQLite first
2. `offlineQueueManager` holds a queue (max 100 items, 4MB limit)
3. Every 30s, if online, sync runs — `isSyncing` flag prevents concurrent runs (set to `false` only in `finally` block)
4. On sync: calls `orderService.createOrder()` + `orderService.processPayment()` with 30s timeout
5. Conflicts resolved by `syncConflictResolver.ts`
6. All sync activity logged in `SyncQueue` and `SyncLog` models

### Local DB tables
- `orders` — captured offline orders
- `order_items` — line items
- `payments` — payment intents
- `sync_metadata` — last sync timestamp per table

### Held orders
- Held orders stored in `orderStore` with `heldAt` timestamp
- `cleanupExpiredHeldOrders()` uses `Date.now()` vs `new Date(heldAt).getTime()` (UTC numeric comparison)
- Resumed orders get `pricesUnvalidated: true` flag — UI should prompt re-validation

---

## 13. Authentication Flow

### Login (POS Desktop)
1. User enters username + password (or PIN for quick login)
2. `authService.login()` → `POST /api/v1/auth/login`
3. Server returns `{ token, user }`
4. Token stored via `secureStorageService` (Electron safeStorage)
5. `authStore` updated with user + token
6. API interceptor attaches `Authorization: Bearer <token>` to all requests
7. On 401: `logout()` called + `window.location.hash = '#/login'`

### Login (Web Admin)
1. User submits login form
2. `POST /api/v1/auth/login`
3. Token stored in `auth_token` cookie (SameSite=Strict)
4. Next.js middleware reads cookie on every request
5. Admin-only routes (`/staff`, `/reports`) also check role claim in JWT

### Logout
- POS Desktop: `authStore.logout()` clears state + `localStorage.removeItem('auth-storage')`
- Web Admin: `clearAuth()` expires `auth_token` cookie

---

## 14. Common Patterns & Conventions

### API responses
```typescript
// Success
{ success: true, data: T }
// Error  
{ success: false, error: { message: string, code?: string } }
// Paginated
{ success: true, data: { items: T[], total, page, limit, totalPages } }
```

### Error handling (backend)
All routes use try/catch. Errors passed to `next(error)` → global `errorHandler` middleware.

### Pagination (backend)
```typescript
const { page, limit, skip } = parsePagination(req.query);
// page ≥ 1, limit 1–200
```

### Search sanitization (backend)
```typescript
const search = (req.query.search as string)?.trim().slice(0, 100);
```

### Bcrypt for PINs
```typescript
import { PIN_BCRYPT_ROUNDS } from '../config/constants';
const hashed = await bcrypt.hash(pin, PIN_BCRYPT_ROUNDS); // always 12
```

### Kitchen station assignment (backend)
Configured in `src/config/kitchenConfig.ts`:
- `KITCHEN_PRIORITY_MAP` — category → priority number
- `KITCHEN_STATION_MAP` — category → station name
- `DEFAULT_KITCHEN_STATION`, `DEFAULT_KITCHEN_PRIORITY`

### React Query (pos-desktop)
All server data fetched via React Query hooks in `src/renderer/hooks/`. Cache invalidation after mutations uses `queryClient.invalidateQueries()`.

### Zustand (pos-desktop)
Stores in `src/renderer/stores/`. `authStore` and `settingsStore` are persisted. `orderStore` and `featureAccessStore` are in-memory only.

### Feature access check
```typescript
const { hasAccess } = useFeatureAccessStore();
if (!hasAccess('SPLIT_BILLING')) return null; // false by default if not found
```

---

## 15. Fixed Issues Reference

This section documents all issues fixed in the April 2026 review. Useful if similar symptoms appear.

| # | Issue | Where Fixed | What Changed |
|---|-------|------------|-------------|
| 1 | PIN validation checked all users | `auth.routes.ts` | `/validate-pin` now checks only the requesting user's PIN; per-userId rate limit added |
| 2 | Session cleanup used 24h window | `jobs/sessionCleanup.ts` | Now deletes WHERE `expiresAt < now()` |
| 3 | N+1 query in order creation | `order.routes.ts` | Single `findMany` before the loop, Map lookup inside |
| 4 | Stale inventory in audit trail | `order.routes.ts` | Re-fetch after `updateMany` to get actual post-update stock |
| 5 | TableLock expiration never enforced | `jobs/sessionCleanup.ts` | Cron job every 15min deletes expired locks |
| 6 | No CSRF protection | `middleware/csrfProtection.ts` + `server.ts` | Origin/Referer validation on state-changing requests |
| 7 | Socket.IO no role-based rooms | `server.ts` | join-room handler checks role before allowing access |
| 8 | Payment audit log silently swallowed | `payment.routes.ts` | Changed `.catch` to `logger.error` |
| 9 | Pagination accepts negatives | `utils/pagination.ts` + routes | `parsePagination()` clamps to valid range |
| 10 | Search has no max length | `menu.routes.ts`, `inventory.routes.ts` | Trim + 100 char cap before Prisma |
| 11 | Inconsistent bcrypt cost for PINs | `config/constants.ts` + 3 route files | `PIN_BCRYPT_ROUNDS = 12` used everywhere |
| 12 | Hardcoded kitchen stations | `config/kitchenConfig.ts` + `order.routes.ts` | Moved to config file |
| 13 | Secure storage falls back to localStorage | `secureStorageService.ts` | Now throws error instead |
| 14 | IPC db-query accepts any SQL | `main/index.ts` | Whitelist SELECT only, block dangerous keywords |
| 15 | Feature access fail-open | `featureAccessStore.ts` | Default return changed to `false` |
| 16 | Token expiry no redirect | `renderer/services/api.ts` | Sets `window.location.hash = '#/login'` on 401 |
| 17 | Offline queue race condition | `offlineQueueManager.ts` | `isSyncing = false` only in `finally` block |
| 18 | Event listeners not cleaned up | `AdvancedCashierPOS.tsx` | Verified all listeners have matching cleanup (already correct) |
| 19 | No CSP headers in Electron | `main/index.ts` | Added `webRequest.onHeadersReceived` CSP injection |
| 20 | Stale item prices on order resume | `orderStore.ts` | Sets `pricesUnvalidated: true` on resume |
| 21 | Auth token not cleared on logout | `authStore.ts` | `localStorage.removeItem('auth-storage')` added |
| 22 | WebSocket handler errors unhandled | `hooks/useWebSocket.ts` | `socket.onAny` handler wrapped in try/catch |
| 23 | PIN entry accepts non-numeric | `LoginScreen.tsx` | `/^\d{4}$/` regex validation before API call |
| 24 | Hardcoded API URL with no warning | `renderer/services/api.ts` | `console.warn()` when VITE_API_URL not set |
| 25 | Date comparison without timezone | `orderStore.ts` | Changed to `Date.now()` vs `.getTime()` numeric comparison |
| 26 | JWT stored in localStorage | `web-admin/lib/auth.ts` + `layout.tsx` | Migrated to `SameSite=Strict` cookie |
| 27 | Auth token key mismatch | `web-admin/middleware.ts` | Aligned to `auth_token` cookie name |
| 28 | Client-side RBAC only | `web-admin/middleware.ts` | Added server-side role check for admin routes |
| 29 | WebSocket connection accumulation | `hooks/useAdminWebSocket.ts` | Guard: disconnect stale socket before creating new |
| 30 | Dashboard race condition / silent failures | `web-admin/app/page.tsx` | Per-metric error flags; WebSocket triggers real refresh |
| 31 | Menu price allows negative/NaN | `web-admin/app/menu/page.tsx` | Validates price > 0 before submit |
| 32 | Purchase order creation broken | `web-admin/app/purchase-orders/page.tsx` | Added item rows to create form |
| 33 | Delivery zone edit not implemented | `web-admin/app/delivery-zones/page.tsx` | Edit button populates form; submits PUT on update |
| 34 | UserRole missing STAFF | `packages/shared-types/src/index.ts` | Added `'STAFF'` to UserRole union |
| 35 | Storage key constants unused | `packages/shared-types/src/constants.ts` | `AUTH_TOKEN` updated to `'auth_token'` |

---

## 15a. Button / Functionality Audit (April 2026)

A full-application sweep was performed verifying that **every clickable element executes real persistence** (API call, service method, store mutation, or hardware IPC) — no mocks, no stubs, no placeholders.

### Coverage
- POS Desktop: 29 screens audited (cashier flow, kitchen, delivery, admin/manager)
- Web Admin: 25 pages audited (10 documented + 15 previously undocumented)
- Shared components in `apps/pos-desktop/src/renderer/components/` and `packages/ui-components/`

### Anti-pattern scans (all returned 0 matches)
- Empty handlers `onClick={() => {}}`
- No-op handlers (`null` / `undefined` / `noop` / `void 0`)
- Hardcoded `const mock|fake|dummy|sample` data arrays
- "Coming Soon" / "Not Implemented" UI text
- Always-`disabled={true}` buttons in POS screens

### Minor non-blocking findings
- `apps/pos-desktop/src/renderer/components/EnhancedErrorBoundary.tsx:80` — `// TODO: Send to backend error tracking service` (Sentry-style hook). Boundary works; this is a future enhancement.

### Resolved during the audit
- **Marketing send idempotency** (`apps/backend-api/src/routes/marketing.routes.ts`) — replaced the pre-check with an atomic `updateMany` claim inside the transaction (`status IN [DRAFT, SCHEDULED] → ACTIVE`). Concurrent send requests now race on the where-clause; only one wins, the loser receives `409 Campaign already sent or send in progress`. Recipient inserts use `skipDuplicates: true` for belt-and-braces.
- **`alert()` → `react-hot-toast`** — replaced 17 native `alert()` calls across 7 web-admin pages (`attendance`, `customers`, `kitchen`, `qr-codes`, `qr/[token]`, `settings`, `tables`). Toast UX uses `toast.error(...)` for failures and `toast.success(...)` for confirmations; the `<Toaster>` is already mounted in `app/layout.tsx` (renders on public QR page too).
- **Duplicate `role-tests.spec.ts` removed** — root-level copy contained hardcoded test passwords (`admin123`, etc.); the canonical version at `apps/pos-desktop/src/renderer/__tests__/role-tests.spec.ts` reads them from `process.env.TEST_*_PASSWORD` via `.env.test`. Stale duplicate deleted via `git rm`.

### Web-admin pages added in this audit (previously undocumented)
`/orders`, `/customers`, `/tables`, `/kitchen`, `/attendance`, `/feature-access`, `/settings`, `/branches`, `/finance`, `/marketing`, `/reviews`, `/tax`, `/external-orders`, `/qr-codes`, `/qr/[token]`

### Backend routes added in this audit (previously undocumented)
`branch.routes.ts`, `marketing.routes.ts`, `review.routes.ts`, `accounting.routes.ts`, `tax.routes.ts`, `external-platform.routes.ts`, `qr-ordering.routes.ts`

### Database migration added
`20260429064438_add_competitor_features` (Apr 29 2026) — schema additions backing branches, marketing, reviews, accounting, tax, external-platform, and qr-ordering features.

---

## 16. Debugging Guide

### "Orders not syncing after going online"
- Check `offlineQueueManager.ts` — look at `isSyncing` flag and retry count
- Check `SyncQueue` table in DB — look for stuck `PENDING` records with high `retryCount`
- Check network tab for timeout errors (30s limit on API calls)

### "User sees stale menu after price change"
- React Query cache — call `queryClient.invalidateQueries(['menu'])` from admin
- Check `menuService.ts` cache TTL setting

### "Table stuck as locked"
- `TableLock` cleanup runs every 15min — check `sessionCleanup.ts` cron job logs
- Manual fix: `DELETE FROM TableLock WHERE tableId = ?`

### "401 loop / infinite redirect"
- Check `auth_token` cookie is set correctly (web-admin) or secureStorage has valid token (pos-desktop)
- Check JWT_SECRET matches between server restarts
- Check `JWT_EXPIRES_IN` in backend .env

### "Kitchen tickets not appearing"
- Check Socket.IO room assignment — kitchen users must join `kitchen` or `kot` room
- Check user role is exactly `KITCHEN` (case-sensitive)
- Check `KotTicket` table for stuck records

### "Payment creates Stripe intent but no audit record"
- `PaymentValidation` insert failure is logged as `logger.error` (not swallowed)
- Check backend logs for "Could not store payment validation record"

### "Feature not accessible despite being enabled in DB"
- `featureAccessStore` defaults to `false` (deny-first)
- Feature name must exactly match what `FeatureAccess.feature` field contains
- Call `featureAccessStore.fetchFeatures()` to refresh

### Common TypeScript errors
- `UserRole` type is in `packages/shared-types/src/index.ts` — must include `'STAFF'` (added)
- `STORAGE_KEYS.AUTH_TOKEN` = `'auth_token'` (updated in constants.ts)

### Port conflicts
- Backend: 3001
- POS Desktop (Vite dev): 5176
- Web Admin (Next.js dev): 3000

### Database connection issues
- Check `DATABASE_URL` in backend `.env`
- Run `npm run db:generate` after schema changes
- Run `npm run db:migrate` to apply migrations
