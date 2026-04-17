# Database Schema - Restaurant POS System

## Overview

Complete database schema using Prisma ORM. Supports both SQLite (local) and PostgreSQL (cloud).

## Enums

```prisma
enum UserRole {
  ADMIN
  MANAGER
  CASHIER
  STAFF
  KITCHEN
  RIDER
}

enum OrderType {
  DINE_IN
  TAKEAWAY
  DELIVERY
  PICKUP
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  SERVED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  MOBILE_WALLET
  BANK_TRANSFER
  SPLIT
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  REFUNDED
}

enum TableStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  NEEDS_CLEANING
  OUT_OF_ORDER
}

enum StockStatus {
  IN_STOCK
  LOW_STOCK
  OUT_OF_STOCK
  DISCONTINUED
}

enum ExpenseCategory {
  SUPPLIES
  UTILITIES
  RENT
  SALARIES
  MAINTENANCE
  MARKETING
  OTHER
}

enum DeliveryStatus {
  PENDING
  ASSIGNED
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  FAILED
  RETURNED
}

enum ShiftStatus {
  OPEN
  CLOSED
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  COMPLETED
  DELAYED
}
```

## Models

### Users & Authentication

```prisma
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  email         String?   @unique
  passwordHash  String
  fullName      String
  role          UserRole  @default(STAFF)
  pin           String?   // Quick login PIN
  phone         String?
  avatar        String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relations
  orders        Order[]
  expenses      Expense[]
  shifts        Shift[]
  auditLogs     AuditLog[]
  deliveries    Delivery[] @relation("RiderDeliveries")

  @@index([username])
  @@index([email])
  @@index([role])
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}
```

### Menu Management

```prisma
model MenuCategory {
  id          String   @id @default(uuid())
  name        String
  description String?
  displayOrder Int    @default(0)
  isActive    Boolean  @default(true)
  image       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items MenuItem[]

  @@index([displayOrder])
}

model MenuItem {
  id              String   @id @default(uuid())
  categoryId      String
  name            String
  description     String?
  price           Decimal  @db.Decimal(10, 2)
  cost            Decimal  @db.Decimal(10, 2) // Cost price for profit calculation
  image           String?
  sku             String?  // Stock keeping unit
  barcode         String?
  isActive        Boolean  @default(true)
  isAvailable     Boolean  @default(true)
  prepTimeMinutes Int      @default(15)
  taxRate         Decimal  @default(0) @db.Decimal(5, 2)
  displayOrder    Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  category        MenuCategory       @relation(fields: [categoryId], references: [id])
  orderItems      OrderItem[]
  inventoryItems  InventoryItem[]
  modifiers       ItemModifier[]
  tags            MenuItemTag[]

  @@index([categoryId])
  @@index([isActive])
  @@index([isAvailable])
  @@index([name])
}

model ItemModifier {
  id            String   @id @default(uuid())
  menuItemId    String
  name          String   // e.g., "Doneness", "Size", "Extra Toppings"
  type          String   // single_select, multi_select, text_input
  isRequired    Boolean  @default(false)
  displayOrder  Int      @default(0)

  menuItem MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  options  ModifierOption[]

  @@index([menuItemId])
}

model ModifierOption {
  id             String   @id @default(uuid())
  modifierId     String
  name           String   // e.g., "Rare", "Medium", "Well Done"
  priceAdjustment Decimal @default(0) @db.Decimal(10, 2)
  isDefault      Boolean  @default(false)
  displayOrder   Int      @default(0)

  modifier ItemModifier @relation(fields: [modifierId], references: [id], onDelete: Cascade)

  @@index([modifierId])
}

model MenuItemTag {
  id         String @id @default(uuid())
  menuItemId String
  tag        String // e.g., "spicy", "vegetarian", "gluten-free", "bestseller"

  menuItem MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)

  @@unique([menuItemId, tag])
  @@index([tag])
}
```

### Orders & Transactions

```prisma
model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique // Human-readable: "ORD-20260417-001"
  orderType       OrderType     @default(DINE_IN)
  status          OrderStatus   @default(PENDING)

  // Customer info
  customerId      String?
  customerName    String?       // For walk-in customers
  customerPhone   String?

  // Table info (for dine-in)
  tableId         String?

  // Financials
  subtotal        Decimal       @db.Decimal(10, 2)
  discountAmount  Decimal       @default(0) @db.Decimal(10, 2)
  discountPercent Decimal       @default(0) @db.Decimal(5, 2)
  taxAmount       Decimal       @default(0) @db.Decimal(10, 2)
  surchargeAmount Decimal       @default(0) @db.Decimal(10, 2)
  totalAmount     Decimal       @db.Decimal(10, 2)
  paidAmount      Decimal       @default(0) @db.Decimal(10, 2)

  // Payment
  paymentMethod   PaymentMethod?
  paymentStatus   PaymentStatus @default(PENDING)

  // Staff
  cashierId       String
  serverId        String?       // Waiter/server

  // Notes
  notes           String?
  kitchenNotes    String?

  // Timestamps
  orderedAt       DateTime      @default(now())
  confirmedAt     DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  cancelReason    String?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  items           OrderItem[]
  payments        Payment[]
  table           Table?        @relation(fields: [tableId], references: [id])
  customer        Customer?     @relation(fields: [customerId], references: [id])
  cashier         User          @relation(fields: [cashierId], references: [id])
  delivery        Delivery?
  kotTickets      KotTicket[]

  @@index([orderNumber])
  @@index([status])
  @@index([orderedAt])
  @@index([customerId])
  @@index([tableId])
  @@index([cashierId])
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  menuItemId      String
  quantity        Int      @default(1)
  unitPrice       Decimal  @db.Decimal(10, 2)
  totalPrice      Decimal  @db.Decimal(10, 2)

  // Customization
  notes           String?
  modifiers       String?  // JSON string of selected modifiers

  // Kitchen
  status          TicketStatus @default(NEW)
  sentToKitchenAt DateTime?
  preparedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])

  @@index([orderId])
  @@index([menuItemId])
  @@index([status])
}

model Payment {
  id            String        @id @default(uuid())
  orderId       String
  method        PaymentMethod
  amount        Decimal       @db.Decimal(10, 2)
  reference     String?       // Transaction ID, card last 4 digits, etc.
  status        PaymentStatus @default(PAID)
  paidAt        DateTime      @default(now())
  notes         String?

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([paidAt])
}
```

### Table Management

```prisma
model Table {
  id          String      @id @default(uuid())
  number      String      // Table number/name
  capacity    Int         @default(4)
  status      TableStatus @default(AVAILABLE)
  location    String?     // e.g., "Patio", "Main Hall", "Bar"
  shape       String?     // "round", "rectangular", "square"
  isActive    Boolean     @default(true)
  posX        Int?        // X position for floor plan
  posY        Int?        // Y position for floor plan
  width       Int?        // Width for floor plan rendering
  height      Int?        // Height for floor plan rendering
  currentOrderId String?  @unique
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  orders Order[]

  @@index([status])
  @@index([location])
  @@index([number])
}
```

### Customers & Loyalty

```prisma
model Customer {
  id              String   @id @default(uuid())
  firstName       String
  lastName        String
  email           String?  @unique
  phone           String   @unique
  address         String?
  city            String?
  dateOfBirth     DateTime?
  gender          String?
  notes           String?

  // Loyalty
  loyaltyPoints   Int      @default(0)
  totalOrders     Int      @default(0)
  totalSpent      Decimal  @default(0) @db.Decimal(10, 2)
  lastVisitAt     DateTime?

  // Preferences
  preferences     String?  // JSON: dietary restrictions, favorite items, etc.

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  orders Order[]

  @@index([phone])
  @@index([email])
  @@index([loyaltyPoints])
}

model LoyaltyTransaction {
  id          String   @id @default(uuid())
  customerId  String
  points      Int      // Positive for earned, negative for redeemed
  reason      String   // "order_completed", "redemption", "bonus", "adjustment"
  referenceId String?  // Order ID or other reference
  balanceAfter Int
  createdAt   DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@index([createdAt])
}
```

### Inventory Management

```prisma
model InventoryItem {
  id              String       @id @default(uuid())
  menuItemId      String?      // Link to menu item if applicable
  name            String
  sku             String?      @unique
  barcode         String?      @unique
  category        String?      // e.g., "Meat", "Vegetables", "Dairy"
  unit            String       // e.g., "kg", "liters", "pieces"

  // Stock levels
  currentStock    Decimal      @db.Decimal(10, 3)
  minStock        Decimal      @db.Decimal(10, 3) // Reorder point
  maxStock        Decimal      @db.Decimal(10, 3) // Maximum capacity
  reservedStock   Decimal      @default(0) @db.Decimal(10, 3) // Reserved for pending orders

  // Pricing
  costPerUnit     Decimal      @db.Decimal(10, 2)
  sellingPrice    Decimal?     @db.Decimal(10, 2)

  // Supplier
  supplierId      String?

  // Status
  status          StockStatus  @default(IN_STOCK)
  isActive        Boolean      @default(true)

  // Warehouse
  warehouseId     String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  menuItem    MenuItem?   @relation(fields: [menuItemId], references: [id])
  supplier    Vendor?     @relation(fields: [supplierId], references: [id])
  warehouse   Warehouse?  @relation(fields: [warehouseId], references: [id])
  movements   StockMovement[]
  adjustments StockAdjustment[]

  @@index([sku])
  @@index([status])
  @@index([warehouseId])
  @@index([currentStock])
}

model StockMovement {
  id                String   @id @default(uuid())
  inventoryItemId   String
  type              String   // "purchase", "sale", "transfer", "adjustment", "wastage"
  quantity          Decimal  @db.Decimal(10, 3)
  previousStock     Decimal  @db.Decimal(10, 3)
  newStock          Decimal  @db.Decimal(10, 3)
  reference         String?  // Order ID, Purchase Order ID, etc.
  notes             String?
  performedById     String?  // User who performed the movement
  createdAt         DateTime @default(now())

  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])

  @@index([inventoryItemId])
  @@index([type])
  @@index([createdAt])
}

model StockAdjustment {
  id                String   @id @default(uuid())
  inventoryItemId   String
  adjustmentType    String   // "correction", "damaged", "expired", "found"
  quantity          Decimal  @db.Decimal(10, 3)
  reason            String
  notes             String?
  adjustedById      String
  createdAt         DateTime @default(now())

  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])

  @@index([inventoryItemId])
  @@index([createdAt])
}

model Warehouse {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  address     String?
  city        String?
  phone       String?
  manager     String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  inventoryItems InventoryItem[]

  @@index([code])
}
```

### Kitchen Management

```prisma
model KotTicket {
  id            String       @id @default(uuid())
  ticketNumber  String       @unique // KOT-20260417-001
  orderId       String
  orderItemId   String?

  // Course tracking
  course        String       @default("main") // appetizer, main, dessert

  // Status
  status        TicketStatus @default(NEW)
  priority      String       @default("normal") // normal, urgent, vip

  // Timing
  orderedAt     DateTime     @default(now())
  startedAt     DateTime?
  completedAt   DateTime?

  // Assignment
  station       String?      // Grill, Fryer, Salad, etc.
  assignedTo    String?      // Chef name/ID

  notes         String?

  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  order Order @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@index([status])
  @@index([ticketNumber])
  @@index([orderedAt])
}
```

### Delivery Management

```prisma
model Delivery {
  id              String         @id @default(uuid())
  orderId         String         @unique
  deliveryNumber  String         @unique // DEL-20260417-001

  // Customer details
  customerName    String
  customerPhone   String
  deliveryAddress String
  deliveryNotes   String?

  // Location
  latitude        Decimal?       @db.Decimal(10, 8)
  longitude       Decimal?       @db.Decimal(11, 8)

  // Rider
  riderId         String?

  // Timing
  estimatedTime   Int?           // Estimated minutes
  dispatchedAt    DateTime?
  pickedUpAt      DateTime?
  deliveredAt     DateTime?

  // Status
  status          DeliveryStatus @default(PENDING)

  // Fees
  deliveryFee     Decimal        @default(0) @db.Decimal(10, 2)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  order  Order @relation(fields: [orderId], references: [id])
  rider? User  @relation("RiderDeliveries", fields: [riderId], references: [id])

  @@index([status])
  @@index([riderId])
  @@index([deliveryNumber])
}
```

### Financial Management

```prisma
model Expense {
  id          String           @id @default(uuid())
  expenseNumber String         @unique // EXP-20260417-001
  category    ExpenseCategory
  description String
  amount      Decimal          @db.Decimal(10, 2)
  paymentMethod String?        // How was it paid
  receipt     String?          // Receipt image path
  notes       String?

  // Staff
  approvedById String?
  createdById  String

  expenseDate DateTime         @default(now())
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  createdBy User @relation(fields: [createdById], references: [id])

  @@index([category])
  @@index([expenseDate])
  @@index([createdById])
}

model Discount {
  id            String   @id @default(uuid())
  name          String
  code          String?  @unique // Promo code
  type          String   // percentage, fixed, buy_one_get_one
  value         Decimal  @db.Decimal(10, 2)
  minValue      Decimal? @db.Decimal(10, 2) // Minimum order value
  maxValue      Decimal? @db.Decimal(10, 2) // Maximum discount
  usageLimit    Int?     // Total usage limit
  usedCount     Int      @default(0)
  isActive      Boolean  @default(true)

  // Validity
  validFrom     DateTime?
  validUntil    DateTime?

  // Applicability
  applicableTo  String   @default("all") // all, specific_items, specific_categories
  itemIds       String?  // JSON array of menu item IDs
  categoryIds   String?  // JSON array of category IDs

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([code])
  @@index([isActive])
}

model Surcharge {
  id          String   @id @default(uuid())
  name        String   // e.g., "Service Charge", "Delivery Fee"
  type        String   // percentage, fixed
  value       Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  applicableTo String  @default("all") // all, dine_in, takeaway, delivery

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive])
}

model TaxRate {
  id        String   @id @default(uuid())
  name      String   // e.g., "VAT", "Sales Tax"
  rate      Decimal  @db.Decimal(5, 2)
  isActive  Boolean  @default(true)
  isInclusive Boolean @default(false) // Is tax included in price

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive])
}

model CashDrawer {
  id            String   @id @default(uuid())
  sessionNumber String   @unique // SESSION-20260417-001
  openedById    String
  closedById    String?

  // Opening
  openingBalance Decimal   @db.Decimal(10, 2)
  openedAt       DateTime  @default(now())

  // Closing
  closingBalance Decimal?  @db.Decimal(10, 2)
  expectedBalance Decimal? @db.Decimal(10, 2)
  discrepancy    Decimal?  @db.Decimal(10, 2)
  closedAt       DateTime?
  closingNotes   String?

  // Summary
  totalSales     Decimal   @default(0) @db.Decimal(10, 2)
  totalCashIn    Decimal   @default(0) @db.Decimal(10, 2)
  totalCashOut   Decimal   @default(0) @db.Decimal(10, 2)
  transactionCount Int     @default(0)

  status         String    @default("open") // open, closed

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([sessionNumber])
  @@index([status])
  @@index([openedAt])
}
```

### Staff Management

```prisma
model Shift {
  id          String     @id @default(uuid())
  userId      String
  shiftNumber String     @unique // SHIFT-20260417-001

  clockedInAt DateTime   @default(now())
  clockedOutAt DateTime?

  scheduledStart DateTime?
  scheduledEnd   DateTime?

  breakStart  DateTime?
  breakEnd    DateTime?

  notes       String?
  status      ShiftStatus @default(OPEN)

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([clockedInAt])
  @@index([status])
}

model StaffPerformance {
  id          String   @id @default(uuid())
  userId      String
  date        DateTime @db.Date

  // Metrics
  ordersHandled Int    @default(0)
  totalSales    Decimal @default(0) @db.Decimal(10, 2)
  avgOrderValue Decimal @default(0) @db.Decimal(10, 2)
  tips          Decimal @default(0) @db.Decimal(10, 2)
  cancellations Int    @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId])
  @@index([date])
}
```

### Vendors & Suppliers

```prisma
model Vendor {
  id          String   @id @default(uuid())
  name        String
  contactName String?
  email       String?
  phone       String?
  address     String?
  city        String?
  website     String?
  notes       String?

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  inventoryItems InventoryItem[]

  @@index([name])
  @@index([phone])
}
```

### Settings & Configuration

```prisma
model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String   @db.Text
  category  String?  // general, financial, printing, etc.
  dataType  String   @default("string") // string, number, boolean, json
  isPublic  Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([key])
  @@index([category])
}

model Device {
  id          String   @id @default(uuid())
  name        String
  type        String   // printer, scanner, cash_drawer, display
  model       String?
  ipAddress   String?
  port        Int?
  config      String?  // JSON configuration
  isActive    Boolean  @default(true)
  lastSeenAt  DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type])
  @@index([isActive])
}
```

### Sync Engine

```prisma
model SyncQueue {
  id          String   @id @default(uuid())
  operation   String   // create, update, delete
  modelName   String   // Which model/table
  recordId    String
  payload     String   @db.Text // JSON of changes
  status      String   @default("pending") // pending, synced, failed
  retryCount  Int      @default(0)
  errorMessage String?
  syncedAt    DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
  @@index([modelName, recordId])
}

model SyncLog {
  id          String   @id @default(uuid())
  action      String   // push, pull, conflict_resolved
  direction   String   // upload, download
  recordsSynced Int    @default(0)
  status      String   // success, partial, failed
  details     String?  @db.Text
  duration    Int?     // milliseconds

  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([status])
}
```

### Audit & Logging

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String   // create, update, delete, login, logout
  entity    String   // Which entity was affected
  entityId  String?
  changes   String?  @db.Text // JSON of before/after
  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entity])
  @@index([entityId])
  @@index([createdAt])
}
```

### Reports Cache (for performance)

```prisma
model ReportCache {
  id          String   @id @default(uuid())
  reportType  String   // daily_sales, inventory_summary, etc.
  period      String   // 2026-04-17, 2026-W16, 2026-04
  data        String   @db.Text // JSON cached results
  generatedAt DateTime @default(now())
  expiresAt   DateTime

  @@unique([reportType, period])
  @@index([expiresAt])
}
```

## Indexes Strategy

### Performance-Critical Indexes
- All foreign keys automatically indexed by Prisma
- Frequently queried fields (status, dates, codes)
- Composite indexes for common query patterns
- Full-text search indexes for product names (PostgreSQL only)

### Recommended Additional Indexes (PostgreSQL)
```sql
-- For sales reports
CREATE INDEX idx_orders_date_status ON orders(ordered_at, status);
CREATE INDEX idx_orders_cashier_date ON orders(cashier_id, ordered_at);

-- For inventory alerts
CREATE INDEX idx_inventory_low_stock ON inventory_items(current_stock, min_stock) WHERE current_stock <= min_stock;

-- For customer lookup
CREATE INDEX idx_customers_phone_name ON customers(phone, first_name);

-- For order search
CREATE INDEX idx_orders_number_customer ON orders(order_number, customer_name);
```

## Data Integrity Constraints

### Business Rules Enforced at Database Level
1. Order total must equal sum of items + tax - discount + surcharge
2. Stock cannot go below zero (check constraint)
3. Payment cannot exceed order total
4. Table cannot have multiple active orders
5. Loyalty points cannot be negative

### Triggers (PostgreSQL)
```sql
-- Auto-update inventory on order completion
-- Calculate order totals automatically
-- Update customer loyalty points
-- Generate KOT tickets for kitchen items
```

## Migration Strategy

### Development → Production
1. Use Prisma Migrate for schema changes
2. Test migrations on staging first
3. Backup database before production migration
4. Have rollback plan ready
5. Monitor migration logs

### Version Control
- All migrations version-controlled
- Seed data for initial setup
- Documentation for manual steps
- Rollback scripts for each migration
