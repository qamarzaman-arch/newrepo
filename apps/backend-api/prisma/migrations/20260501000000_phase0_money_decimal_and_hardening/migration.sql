-- Phase 0 Hardening Migration
-- Refs: QA defects D1, A65, A66, A67, A21, A22, A23, A24, A25, A26, A41,
-- A48, A52, A62, A68, A69, A70 (partial), A71 (partial), A78, A79, B23, B47,
-- D6, D7, D8, D11, D30, D6/D7 (cascade rules)
--
-- DESTRUCTIVE: Float -> Decimal column changes will rewrite tables on MySQL.
-- Run on a non-production DB first, take a backup before applying to prod.

-- =============================================================================
-- 1. NEW TABLES
-- =============================================================================

CREATE TABLE `PinAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `resetAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PinAttempt_userId_key`(`userId`),
    INDEX `PinAttempt_resetAt_idx`(`resetAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StripeWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payload` LONGTEXT NOT NULL,

    UNIQUE INDEX `StripeWebhookEvent_eventId_key`(`eventId`),
    INDEX `StripeWebhookEvent_eventType_idx`(`eventType`),
    INDEX `StripeWebhookEvent_processedAt_idx`(`processedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SequenceCounter` (
    `scope` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SequenceCounter_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`scope`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- 2. MONEY: Float -> Decimal conversions
-- =============================================================================

-- MenuItem
ALTER TABLE `MenuItem`
    MODIFY `price`   DECIMAL(12, 2) NOT NULL,
    MODIFY `cost`    DECIMAL(12, 2) NOT NULL,
    MODIFY `taxRate` DECIMAL(5, 2)  NOT NULL DEFAULT 0;

-- ModifierOption
ALTER TABLE `ModifierOption`
    MODIFY `priceAdjustment` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Order
ALTER TABLE `Order`
    MODIFY `subtotal`        DECIMAL(12, 2) NOT NULL,
    MODIFY `discountAmount`  DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `discountPercent` DECIMAL(5, 2)  NOT NULL DEFAULT 0,
    MODIFY `taxAmount`       DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `surchargeAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `tipAmount`       DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `totalAmount`     DECIMAL(12, 2) NOT NULL,
    MODIFY `paidAmount`      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `discountId` VARCHAR(191) NULL;

-- OrderItem
ALTER TABLE `OrderItem`
    MODIFY `unitPrice`  DECIMAL(12, 2) NOT NULL,
    MODIFY `totalPrice` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `voidedAt`   DATETIME(3) NULL,
    ADD COLUMN `voidedById` VARCHAR(191) NULL,
    ADD COLUMN `voidReason` VARCHAR(191) NULL;

-- Payment
ALTER TABLE `Payment`
    MODIFY `amount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `stripePaymentIntentId` VARCHAR(191) NULL,
    ADD COLUMN `stripeChargeId`        VARCHAR(191) NULL,
    ADD COLUMN `stripeRefundId`        VARCHAR(191) NULL;

CREATE INDEX `Payment_orderId_status_idx` ON `Payment`(`orderId`, `status`);
CREATE INDEX `Payment_stripePaymentIntentId_idx` ON `Payment`(`stripePaymentIntentId`);

-- PaymentValidation: add orderId FK + idempotency key + widen amount precision
ALTER TABLE `PaymentValidation`
    MODIFY `amount`   DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `orderId`        VARCHAR(191) NULL,
    ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `PaymentValidation_idempotencyKey_key` ON `PaymentValidation`(`idempotencyKey`);
CREATE INDEX `PaymentValidation_orderId_idx` ON `PaymentValidation`(`orderId`);

-- Customer
ALTER TABLE `Customer`
    MODIFY `totalSpent` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `loyaltyPointsFraction` DECIMAL(12, 4) NOT NULL DEFAULT 0;

-- InventoryItem
ALTER TABLE `InventoryItem`
    MODIFY `currentStock`  DECIMAL(14, 3) NOT NULL DEFAULT 0,
    MODIFY `minStock`      DECIMAL(14, 3) NOT NULL DEFAULT 0,
    MODIFY `maxStock`      DECIMAL(14, 3) NOT NULL DEFAULT 0,
    MODIFY `reservedStock` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    MODIFY `costPerUnit`   DECIMAL(12, 4) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX `InventoryItem_warehouseId_menuItemId_key` ON `InventoryItem`(`warehouseId`, `menuItemId`);
CREATE INDEX `InventoryItem_supplierId_idx` ON `InventoryItem`(`supplierId`);

-- StockMovement / StockAdjustment
ALTER TABLE `StockMovement`
    MODIFY `quantity`      DECIMAL(14, 3) NOT NULL,
    MODIFY `previousStock` DECIMAL(14, 3) NOT NULL,
    MODIFY `newStock`      DECIMAL(14, 3) NOT NULL;

ALTER TABLE `StockAdjustment`
    MODIFY `quantity` DECIMAL(14, 3) NOT NULL;

-- Delivery
ALTER TABLE `Delivery`
    MODIFY `deliveryFee` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- DeliveryZone
ALTER TABLE `DeliveryZone`
    MODIFY `baseFee`               DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `minimumOrder`          DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `freeDeliveryThreshold` DECIMAL(12, 2) NULL;

-- Expense
ALTER TABLE `Expense`
    MODIFY `amount` DECIMAL(12, 2) NOT NULL;

-- Discount
ALTER TABLE `Discount`
    MODIFY `value` DECIMAL(12, 2) NOT NULL;

-- Surcharge
ALTER TABLE `Surcharge`
    MODIFY `value` DECIMAL(12, 2) NOT NULL;

-- TaxRate
ALTER TABLE `TaxRate`
    MODIFY `rate` DECIMAL(5, 2) NOT NULL;

CREATE UNIQUE INDEX `TaxRate_name_isActive_key` ON `TaxRate`(`name`, `isActive`);

-- CashDrawer
ALTER TABLE `CashDrawer`
    MODIFY `openingBalance`  DECIMAL(12, 2) NOT NULL,
    MODIFY `closingBalance`  DECIMAL(12, 2) NULL,
    MODIFY `expectedBalance` DECIMAL(12, 2) NULL,
    MODIFY `discrepancy`     DECIMAL(12, 2) NULL,
    MODIFY `totalSales`      DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `totalCashIn`     DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `totalCashOut`    DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `discrepancyPercent` DECIMAL(7, 4) NULL,
    ADD COLUMN `discrepancyFlagged` BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX `CashDrawer_discrepancyFlagged_idx` ON `CashDrawer`(`discrepancyFlagged`);

-- StaffPerformance
ALTER TABLE `StaffPerformance`
    MODIFY `totalSales`      DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `totalCommission` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `avgOrderValue`   DECIMAL(12, 2) NOT NULL DEFAULT 0,
    MODIFY `tips`            DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Combo / ComboItem
ALTER TABLE `Combo`
    MODIFY `price` DECIMAL(12, 2) NOT NULL;

ALTER TABLE `ComboItem`
    MODIFY `price` DECIMAL(12, 2) NOT NULL;

-- Recipe / RecipeIngredient
ALTER TABLE `Recipe`
    MODIFY `cost` DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE `RecipeIngredient`
    MODIFY `quantity` DECIMAL(14, 3) NOT NULL;

-- PurchaseOrder / PurchaseOrderItem
ALTER TABLE `PurchaseOrder`
    MODIFY `totalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE `PurchaseOrderItem`
    MODIFY `quantity`         DECIMAL(14, 3) NOT NULL,
    MODIFY `unitCost`         DECIMAL(12, 4) NOT NULL,
    MODIFY `receivedQuantity` DECIMAL(14, 3) NOT NULL DEFAULT 0;

-- JournalEntry / JournalLine
ALTER TABLE `JournalEntry`
    MODIFY `totalDebit`  DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `totalCredit` DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE `JournalLine`
    MODIFY `debit`  DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `credit` DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- TaxFiling
ALTER TABLE `TaxFiling`
    MODIFY `amount`    DECIMAL(14, 2) NOT NULL,
    MODIFY `taxAmount` DECIMAL(12, 2) NOT NULL;

-- ExternalPlatformOrder
ALTER TABLE `ExternalPlatformOrder`
    MODIFY `totalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- =============================================================================
-- 3. SECURITY / OPTIMISTIC LOCKING / AUDIT
-- =============================================================================

-- Session token-hash index for fast lookup
ALTER TABLE `Session`
    ADD COLUMN `tokenHash` VARCHAR(64) NULL;

CREATE INDEX `Session_tokenHash_idx` ON `Session`(`tokenHash`);
CREATE INDEX `Session_expiresAt_idx` ON `Session`(`expiresAt`);

-- Table optimistic-lock version (B23)
ALTER TABLE `Table`
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `Table_currentOrderId_idx` ON `Table`(`currentOrderId`);

-- KotTicket optimistic-lock + delay tracking (A31, A34)
ALTER TABLE `KotTicket`
    ADD COLUMN `version`     INTEGER  NOT NULL DEFAULT 0,
    ADD COLUMN `delayReason` VARCHAR(191) NULL,
    ADD COLUMN `delayedAt`   DATETIME(3) NULL;

-- AuditLog correlation
ALTER TABLE `AuditLog`
    ADD COLUMN `requestId` VARCHAR(191) NULL;

CREATE INDEX `AuditLog_requestId_idx` ON `AuditLog`(`requestId`);

-- =============================================================================
-- 4. UNIQUE CONSTRAINTS (defensive)
-- =============================================================================

-- MenuItem SKU/barcode uniqueness (A73)
-- Use sparse-style: rely on MySQL allowing multiple NULLs in UNIQUE.
-- If existing data has duplicates, this will fail; clean first.
CREATE UNIQUE INDEX `MenuItem_sku_key` ON `MenuItem`(`sku`);
CREATE UNIQUE INDEX `MenuItem_barcode_key` ON `MenuItem`(`barcode`);

-- =============================================================================
-- 5. FK BEHAVIOUR ADJUSTMENTS
-- =============================================================================

-- StockAlert: cascade on inventory delete (D6)
ALTER TABLE `StockAlert`
    DROP FOREIGN KEY `StockAlert_inventoryItemId_fkey`;
ALTER TABLE `StockAlert`
    ADD CONSTRAINT `StockAlert_inventoryItemId_fkey`
    FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- OrderModificationHistory: preserve audit trail (D7)
ALTER TABLE `OrderModificationHistory`
    DROP FOREIGN KEY `OrderModificationHistory_modifiedById_fkey`;
ALTER TABLE `OrderModificationHistory`
    ADD CONSTRAINT `OrderModificationHistory_modifiedById_fkey`
    FOREIGN KEY (`modifiedById`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shift: preserve history (D11)
ALTER TABLE `Shift`
    DROP FOREIGN KEY `Shift_userId_fkey`;
ALTER TABLE `Shift`
    ADD CONSTRAINT `Shift_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- PinAttempt FK
ALTER TABLE `PinAttempt`
    ADD CONSTRAINT `PinAttempt_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentValidation FK to Order (A62)
ALTER TABLE `PaymentValidation`
    ADD CONSTRAINT `PaymentValidation_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- 6. QrSession expires index (D52 prep)
-- =============================================================================
CREATE INDEX `QrSession_expiresAt_idx` ON `QrSession`(`expiresAt`);
