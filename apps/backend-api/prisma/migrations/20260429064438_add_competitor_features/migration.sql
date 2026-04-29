-- AlterTable
ALTER TABLE `order` ADD COLUMN `branchId` VARCHAR(191) NULL,
    ADD COLUMN `externalSource` VARCHAR(191) NULL,
    ADD COLUMN `qrSessionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `isHeadOffice` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `timezone` VARCHAR(191) NULL DEFAULT 'Asia/Karachi',
    `currency` VARCHAR(191) NULL DEFAULT 'PKR',
    `taxId` VARCHAR(191) NULL,
    `openingTime` VARCHAR(191) NULL,
    `closingTime` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Branch_code_key`(`code`),
    INDEX `Branch_code_idx`(`code`),
    INDEX `Branch_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketingCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `audience` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `audienceFilter` JSON NULL,
    `message` TEXT NOT NULL,
    `subject` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `ctaUrl` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `recipientsCount` INTEGER NOT NULL DEFAULT 0,
    `deliveredCount` INTEGER NOT NULL DEFAULT 0,
    `openedCount` INTEGER NOT NULL DEFAULT 0,
    `clickedCount` INTEGER NOT NULL DEFAULT 0,
    `branchId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketingCampaign_status_idx`(`status`),
    INDEX `MarketingCampaign_branchId_idx`(`branchId`),
    INDEX `MarketingCampaign_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignRecipient` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `clickedAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(191) NULL,

    INDEX `CampaignRecipient_campaignId_idx`(`campaignId`),
    INDEX `CampaignRecipient_customerId_idx`(`customerId`),
    UNIQUE INDEX `CampaignRecipient_campaignId_customerId_key`(`campaignId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerReview` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL,
    `foodRating` INTEGER NULL,
    `serviceRating` INTEGER NULL,
    `comment` TEXT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'IN_APP',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PUBLISHED',
    `reply` TEXT NULL,
    `repliedAt` DATETIME(3) NULL,
    `repliedById` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerReview_orderId_idx`(`orderId`),
    INDEX `CustomerReview_customerId_idx`(`customerId`),
    INDEX `CustomerReview_rating_idx`(`rating`),
    INDEX `CustomerReview_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChartOfAccounts` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChartOfAccounts_code_key`(`code`),
    INDEX `ChartOfAccounts_type_idx`(`type`),
    INDEX `ChartOfAccounts_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalEntry` (
    `id` VARCHAR(191) NOT NULL,
    `entryNumber` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `refType` VARCHAR(191) NULL,
    `totalDebit` DOUBLE NOT NULL DEFAULT 0,
    `totalCredit` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'POSTED',
    `branchId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `JournalEntry_entryNumber_key`(`entryNumber`),
    INDEX `JournalEntry_date_idx`(`date`),
    INDEX `JournalEntry_refType_reference_idx`(`refType`, `reference`),
    INDEX `JournalEntry_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalLine` (
    `id` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `debit` DOUBLE NOT NULL DEFAULT 0,
    `credit` DOUBLE NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,

    INDEX `JournalLine_entryId_idx`(`entryId`),
    INDEX `JournalLine_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxFiling` (
    `id` VARCHAR(191) NOT NULL,
    `authority` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `fbrInvoiceNumber` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `taxAmount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NULL,
    `responseBody` JSON NULL,
    `errorMessage` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TaxFiling_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `TaxFiling_orderId_key`(`orderId`),
    INDEX `TaxFiling_authority_idx`(`authority`),
    INDEX `TaxFiling_status_idx`(`status`),
    INDEX `TaxFiling_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalPlatformOrder` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `externalStatus` VARCHAR(191) NULL,
    `rawPayload` JSON NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `deliveryAddress` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'RECEIVED',
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `branchId` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,

    UNIQUE INDEX `ExternalPlatformOrder_orderId_key`(`orderId`),
    INDEX `ExternalPlatformOrder_platform_idx`(`platform`),
    INDEX `ExternalPlatformOrder_status_idx`(`status`),
    INDEX `ExternalPlatformOrder_branchId_idx`(`branchId`),
    UNIQUE INDEX `ExternalPlatformOrder_platform_externalId_key`(`platform`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QrSession` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `tableId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,

    UNIQUE INDEX `QrSession_token_key`(`token`),
    INDEX `QrSession_token_idx`(`token`),
    INDEX `QrSession_tableId_idx`(`tableId`),
    INDEX `QrSession_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_qrSessionId_fkey` FOREIGN KEY (`qrSessionId`) REFERENCES `QrSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketingCampaign` ADD CONSTRAINT `MarketingCampaign_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignRecipient` ADD CONSTRAINT `CampaignRecipient_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `MarketingCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignRecipient` ADD CONSTRAINT `CampaignRecipient_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReview` ADD CONSTRAINT `CustomerReview_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReview` ADD CONSTRAINT `CustomerReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReview` ADD CONSTRAINT `CustomerReview_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChartOfAccounts` ADD CONSTRAINT `ChartOfAccounts_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ChartOfAccounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalEntry` ADD CONSTRAINT `JournalEntry_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `JournalEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ChartOfAccounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxFiling` ADD CONSTRAINT `TaxFiling_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxFiling` ADD CONSTRAINT `TaxFiling_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalPlatformOrder` ADD CONSTRAINT `ExternalPlatformOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalPlatformOrder` ADD CONSTRAINT `ExternalPlatformOrder_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrSession` ADD CONSTRAINT `QrSession_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrSession` ADD CONSTRAINT `QrSession_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QrSession` ADD CONSTRAINT `QrSession_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
