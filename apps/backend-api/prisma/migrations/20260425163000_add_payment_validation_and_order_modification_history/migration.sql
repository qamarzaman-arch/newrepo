-- CreateTable
CREATE TABLE `PaymentValidation` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'CARD',
    `status` VARCHAR(191) NOT NULL,
    `cardLastFour` VARCHAR(191) NULL,
    `gatewayResponse` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentValidation_transactionId_key`(`transactionId`),
    INDEX `PaymentValidation_createdAt_idx`(`createdAt`),
    INDEX `PaymentValidation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderModificationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `fieldName` VARCHAR(191) NOT NULL,
    `oldValue` LONGTEXT NULL,
    `newValue` LONGTEXT NULL,
    `reason` LONGTEXT NULL,
    `modifiedById` VARCHAR(191) NOT NULL,
    `modifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderModificationHistory_orderId_idx`(`orderId`),
    INDEX `OrderModificationHistory_modifiedById_idx`(`modifiedById`),
    INDEX `OrderModificationHistory_fieldName_idx`(`fieldName`),
    INDEX `OrderModificationHistory_modifiedAt_idx`(`modifiedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrderModificationHistory` ADD CONSTRAINT `OrderModificationHistory_orderId_fkey`
FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderModificationHistory` ADD CONSTRAINT `OrderModificationHistory_modifiedById_fkey`
FOREIGN KEY (`modifiedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
