-- QA D9: pin DB-level default collation. ALTER DATABASE only affects defaults
-- for newly-created tables; existing tables keep whatever they were created
-- with. ALTER TABLE ... MODIFY COLUMN with the desired collation is a no-op
-- when already at that collation, so this migration is safe to re-run.
--
-- Prisma's migrate deploy executes statements one at a time using the MySQL
-- protocol — DELIMITER and CREATE PROCEDURE bodies don't work here, so we
-- stick to plain DDL.
--
-- The QrSession composite index that was here previously is already declared
-- via @@index in schema.prisma and gets created by the table's own migration,
-- so it's omitted from this file.

ALTER DATABASE `restaurant_pos`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_as_cs;

ALTER TABLE `MenuItem`      MODIFY COLUMN `sku`      VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `MenuItem`      MODIFY COLUMN `barcode`  VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `InventoryItem` MODIFY COLUMN `sku`      VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `InventoryItem` MODIFY COLUMN `barcode`  VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `Discount`      MODIFY COLUMN `code`     VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `Branch`        MODIFY COLUMN `code`     VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `Warehouse`     MODIFY COLUMN `code`     VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `User`          MODIFY COLUMN `username` VARCHAR(191) COLLATE utf8mb4_0900_as_cs;
