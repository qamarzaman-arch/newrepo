-- AlterTable
ALTER TABLE `order` ADD COLUMN `tipAmount` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `staffperformance` ADD COLUMN `totalCommission` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `StockAlert` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `alertType` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockAlert_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `StockAlert_alertType_idx`(`alertType`),
    INDEX `StockAlert_isResolved_idx`(`isResolved`),
    INDEX `StockAlert_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockAlert` ADD CONSTRAINT `StockAlert_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
