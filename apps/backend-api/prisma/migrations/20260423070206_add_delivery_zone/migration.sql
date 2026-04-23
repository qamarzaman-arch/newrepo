-- CreateTable
CREATE TABLE `DeliveryZone` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `baseFee` DOUBLE NOT NULL DEFAULT 0,
    `minimumOrder` DOUBLE NOT NULL DEFAULT 0,
    `freeDeliveryThreshold` DOUBLE NULL,
    `estimatedTimeMin` INTEGER NOT NULL,
    `estimatedTimeMax` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `color` VARCHAR(191) NULL,
    `coordinates` JSON NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DeliveryZone_isActive_idx`(`isActive`),
    INDEX `DeliveryZone_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderCounter` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `count` INTEGER NOT NULL DEFAULT 0,
    `date` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderCounter_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TableLock` (
    `id` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TableLock_tableId_key`(`tableId`),
    INDEX `TableLock_userId_idx`(`userId`),
    INDEX `TableLock_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdempotencyKey` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `requestPath` VARCHAR(191) NOT NULL,
    `requestBody` LONGTEXT NOT NULL,
    `responseBody` LONGTEXT NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IdempotencyKey_key_key`(`key`),
    INDEX `IdempotencyKey_key_idx`(`key`),
    INDEX `IdempotencyKey_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `InventoryItem_menuItemId_status_idx` ON `InventoryItem`(`menuItemId`, `status`);

-- CreateIndex
CREATE INDEX `InventoryItem_status_currentStock_idx` ON `InventoryItem`(`status`, `currentStock`);

-- CreateIndex
CREATE INDEX `OrderItem_status_sentToKitchenAt_idx` ON `OrderItem`(`status`, `sentToKitchenAt`);

-- CreateIndex
CREATE INDEX `OrderItem_status_preparedAt_idx` ON `OrderItem`(`status`, `preparedAt`);

-- CreateIndex
CREATE INDEX `Payment_status_paidAt_idx` ON `Payment`(`status`, `paidAt`);

-- CreateIndex
CREATE INDEX `Payment_method_paidAt_idx` ON `Payment`(`method`, `paidAt`);

-- AddForeignKey
ALTER TABLE `DeliveryZone` ADD CONSTRAINT `DeliveryZone_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TableLock` ADD CONSTRAINT `TableLock_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TableLock` ADD CONSTRAINT `TableLock_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
