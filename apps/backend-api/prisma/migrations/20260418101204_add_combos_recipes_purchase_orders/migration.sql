-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'STAFF',
    `pin` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_username_idx`(`username`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MenuCategory_displayOrder_idx`(`displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `cost` DOUBLE NOT NULL,
    `image` VARCHAR(191) NULL,
    `sku` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `prepTimeMinutes` INTEGER NOT NULL DEFAULT 15,
    `taxRate` DOUBLE NOT NULL DEFAULT 0,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MenuItem_categoryId_idx`(`categoryId`),
    INDEX `MenuItem_isActive_idx`(`isActive`),
    INDEX `MenuItem_isAvailable_idx`(`isAvailable`),
    INDEX `MenuItem_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemModifier` (
    `id` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ItemModifier_menuItemId_idx`(`menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModifierOption` (
    `id` VARCHAR(191) NOT NULL,
    `modifierId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceAdjustment` DOUBLE NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ModifierOption_modifierId_idx`(`modifierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItemTag` (
    `id` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,

    INDEX `MenuItemTag_tag_idx`(`tag`),
    UNIQUE INDEX `MenuItemTag_menuItemId_tag_key`(`menuItemId`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `orderType` VARCHAR(191) NOT NULL DEFAULT 'DINE_IN',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `tableId` VARCHAR(191) NULL,
    `subtotal` DOUBLE NOT NULL,
    `discountAmount` DOUBLE NOT NULL DEFAULT 0,
    `discountPercent` DOUBLE NOT NULL DEFAULT 0,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `surchargeAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(191) NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `cashierId` VARCHAR(191) NOT NULL,
    `serverId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `kitchenNotes` VARCHAR(191) NULL,
    `orderedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_orderNumber_idx`(`orderNumber`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_orderedAt_idx`(`orderedAt`),
    INDEX `Order_customerId_idx`(`customerId`),
    INDEX `Order_tableId_idx`(`tableId`),
    INDEX `Order_cashierId_idx`(`cashierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `notes` VARCHAR(191) NULL,
    `modifiers` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    `sentToKitchenAt` DATETIME(3) NULL,
    `preparedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_menuItemId_idx`(`menuItemId`),
    INDEX `OrderItem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reference` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PAID',
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    INDEX `Payment_orderId_idx`(`orderId`),
    INDEX `Payment_paidAt_idx`(`paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Table` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 4,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `location` VARCHAR(191) NULL,
    `shape` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `posX` INTEGER NULL,
    `posY` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `currentOrderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Table_currentOrderId_key`(`currentOrderId`),
    INDEX `Table_status_idx`(`status`),
    INDEX `Table_location_idx`(`location`),
    INDEX `Table_number_idx`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `loyaltyPoints` INTEGER NOT NULL DEFAULT 0,
    `totalOrders` INTEGER NOT NULL DEFAULT 0,
    `totalSpent` DOUBLE NOT NULL DEFAULT 0,
    `lastVisitAt` DATETIME(3) NULL,
    `preferences` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_email_key`(`email`),
    UNIQUE INDEX `Customer_phone_key`(`phone`),
    INDEX `Customer_phone_idx`(`phone`),
    INDEX `Customer_email_idx`(`email`),
    INDEX `Customer_loyaltyPoints_idx`(`loyaltyPoints`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoyaltyTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `balanceAfter` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoyaltyTransaction_customerId_idx`(`customerId`),
    INDEX `LoyaltyTransaction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL,
    `currentStock` DOUBLE NOT NULL,
    `minStock` DOUBLE NOT NULL,
    `maxStock` DOUBLE NOT NULL,
    `reservedStock` DOUBLE NOT NULL DEFAULT 0,
    `costPerUnit` DOUBLE NOT NULL,
    `sellingPrice` DECIMAL(65, 30) NULL,
    `supplierId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IN_STOCK',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `warehouseId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryItem_sku_key`(`sku`),
    UNIQUE INDEX `InventoryItem_barcode_key`(`barcode`),
    INDEX `InventoryItem_sku_idx`(`sku`),
    INDEX `InventoryItem_status_idx`(`status`),
    INDEX `InventoryItem_warehouseId_idx`(`warehouseId`),
    INDEX `InventoryItem_currentStock_idx`(`currentStock`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `previousStock` DOUBLE NOT NULL,
    `newStock` DOUBLE NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `StockMovement_type_idx`(`type`),
    INDEX `StockMovement_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockAdjustment` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `adjustmentType` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `adjustedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockAdjustment_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `StockAdjustment_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warehouse` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `manager` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Warehouse_code_key`(`code`),
    INDEX `Warehouse_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KotTicket` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NULL,
    `course` VARCHAR(191) NOT NULL DEFAULT 'main',
    `status` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `orderedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `station` VARCHAR(191) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KotTicket_ticketNumber_key`(`ticketNumber`),
    INDEX `KotTicket_orderId_idx`(`orderId`),
    INDEX `KotTicket_status_idx`(`status`),
    INDEX `KotTicket_ticketNumber_idx`(`ticketNumber`),
    INDEX `KotTicket_orderedAt_idx`(`orderedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delivery` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `deliveryNumber` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `deliveryAddress` VARCHAR(191) NOT NULL,
    `deliveryNotes` VARCHAR(191) NULL,
    `latitude` DECIMAL(65, 30) NULL,
    `longitude` DECIMAL(65, 30) NULL,
    `riderId` VARCHAR(191) NULL,
    `estimatedTime` INTEGER NULL,
    `dispatchedAt` DATETIME(3) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `deliveryFee` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Delivery_orderId_key`(`orderId`),
    UNIQUE INDEX `Delivery_deliveryNumber_key`(`deliveryNumber`),
    INDEX `Delivery_status_idx`(`status`),
    INDEX `Delivery_riderId_idx`(`riderId`),
    INDEX `Delivery_deliveryNumber_idx`(`deliveryNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `expenseNumber` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `receipt` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Expense_expenseNumber_key`(`expenseNumber`),
    INDEX `Expense_category_idx`(`category`),
    INDEX `Expense_expenseDate_idx`(`expenseDate`),
    INDEX `Expense_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Discount` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `minValue` DECIMAL(65, 30) NULL,
    `maxValue` DECIMAL(65, 30) NULL,
    `usageLimit` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `validFrom` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `applicableTo` VARCHAR(191) NOT NULL DEFAULT 'all',
    `itemIds` VARCHAR(191) NULL,
    `categoryIds` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Discount_code_key`(`code`),
    INDEX `Discount_code_idx`(`code`),
    INDEX `Discount_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Surcharge` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `applicableTo` VARCHAR(191) NOT NULL DEFAULT 'all',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Surcharge_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxRate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isInclusive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxRate_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashDrawer` (
    `id` VARCHAR(191) NOT NULL,
    `sessionNumber` VARCHAR(191) NOT NULL,
    `openedById` VARCHAR(191) NOT NULL,
    `closedById` VARCHAR(191) NULL,
    `openingBalance` DOUBLE NOT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closingBalance` DECIMAL(65, 30) NULL,
    `expectedBalance` DECIMAL(65, 30) NULL,
    `discrepancy` DECIMAL(65, 30) NULL,
    `closedAt` DATETIME(3) NULL,
    `closingNotes` VARCHAR(191) NULL,
    `totalSales` DOUBLE NOT NULL DEFAULT 0,
    `totalCashIn` DOUBLE NOT NULL DEFAULT 0,
    `totalCashOut` DOUBLE NOT NULL DEFAULT 0,
    `transactionCount` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CashDrawer_sessionNumber_key`(`sessionNumber`),
    INDEX `CashDrawer_sessionNumber_idx`(`sessionNumber`),
    INDEX `CashDrawer_status_idx`(`status`),
    INDEX `CashDrawer_openedAt_idx`(`openedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shift` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `shiftNumber` VARCHAR(191) NOT NULL,
    `clockedInAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `clockedOutAt` DATETIME(3) NULL,
    `scheduledStart` DATETIME(3) NULL,
    `scheduledEnd` DATETIME(3) NULL,
    `breakStart` DATETIME(3) NULL,
    `breakEnd` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Shift_shiftNumber_key`(`shiftNumber`),
    INDEX `Shift_userId_idx`(`userId`),
    INDEX `Shift_clockedInAt_idx`(`clockedInAt`),
    INDEX `Shift_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffPerformance` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `ordersHandled` INTEGER NOT NULL DEFAULT 0,
    `totalSales` DOUBLE NOT NULL DEFAULT 0,
    `avgOrderValue` DOUBLE NOT NULL DEFAULT 0,
    `tips` DOUBLE NOT NULL DEFAULT 0,
    `cancellations` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffPerformance_userId_idx`(`userId`),
    INDEX `StaffPerformance_date_idx`(`date`),
    UNIQUE INDEX `StaffPerformance_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vendor_name_idx`(`name`),
    INDEX `Vendor_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `dataType` VARCHAR(191) NOT NULL DEFAULT 'string',
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
    INDEX `Setting_key_idx`(`key`),
    INDEX `Setting_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `config` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Device_type_idx`(`type`),
    INDEX `Device_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncQueue` (
    `id` VARCHAR(191) NOT NULL,
    `operation` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` VARCHAR(191) NULL,
    `syncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SyncQueue_status_idx`(`status`),
    INDEX `SyncQueue_createdAt_idx`(`createdAt`),
    INDEX `SyncQueue_modelName_recordId_idx`(`modelName`, `recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `recordsSynced` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SyncLog_createdAt_idx`(`createdAt`),
    INDEX `SyncLog_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `changes` LONGTEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_entity_idx`(`entity`),
    INDEX `AuditLog_entityId_idx`(`entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportCache` (
    `id` VARCHAR(191) NOT NULL,
    `reportType` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `ReportCache_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `ReportCache_reportType_period_key`(`reportType`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Combo` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Combo_isAvailable_idx`(`isAvailable`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComboItem` (
    `id` VARCHAR(191) NOT NULL,
    `comboId` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,

    INDEX `ComboItem_comboId_idx`(`comboId`),
    INDEX `ComboItem_menuItemId_idx`(`menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recipe` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `instructions` LONGTEXT NULL,
    `prepTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `cookTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `servings` INTEGER NOT NULL DEFAULT 1,
    `cost` DOUBLE NOT NULL DEFAULT 0,
    `menuItemId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Recipe_menuItemId_idx`(`menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeIngredient` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,

    INDEX `RecipeIngredient_recipeId_idx`(`recipeId`),
    INDEX `RecipeIngredient_inventoryItemId_idx`(`inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `expectedDelivery` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseOrder_vendorId_idx`(`vendorId`),
    INDEX `PurchaseOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `receivedQuantity` DOUBLE NOT NULL DEFAULT 0,

    INDEX `PurchaseOrderItem_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `PurchaseOrderItem_inventoryItemId_idx`(`inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `MenuCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemModifier` ADD CONSTRAINT `ItemModifier_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModifierOption` ADD CONSTRAINT `ModifierOption_modifierId_fkey` FOREIGN KEY (`modifierId`) REFERENCES `ItemModifier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuItemTag` ADD CONSTRAINT `MenuItemTag_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoyaltyTransaction` ADD CONSTRAINT `LoyaltyTransaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustment` ADD CONSTRAINT `StockAdjustment_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KotTicket` ADD CONSTRAINT `KotTicket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_riderId_fkey` FOREIGN KEY (`riderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shift` ADD CONSTRAINT `Shift_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComboItem` ADD CONSTRAINT `ComboItem_comboId_fkey` FOREIGN KEY (`comboId`) REFERENCES `Combo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComboItem` ADD CONSTRAINT `ComboItem_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
