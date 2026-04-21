/*
  Warnings:

  - You are about to alter the column `orderType` on the `order` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `order` MODIFY `orderType` ENUM('DINE_IN', 'WALK_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP', 'RESERVATION') NOT NULL DEFAULT 'DINE_IN';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastLocationAt` DATETIME(3) NULL,
    ADD COLUMN `lastLocationLat` DECIMAL(10, 8) NULL,
    ADD COLUMN `lastLocationLng` DECIMAL(11, 8) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL DEFAULT 'ACTIVE',
    ADD COLUMN `vehiclePlate` VARCHAR(191) NULL,
    ADD COLUMN `vehicleType` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Delivery_status_createdAt_idx` ON `Delivery`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `KotTicket_status_orderedAt_idx` ON `KotTicket`(`status`, `orderedAt`);

-- CreateIndex
CREATE INDEX `Order_status_orderedAt_idx` ON `Order`(`status`, `orderedAt`);

-- CreateIndex
CREATE INDEX `User_isAvailable_idx` ON `User`(`isAvailable`);
