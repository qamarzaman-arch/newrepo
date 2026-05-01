/**
 * Runtime enum guards (QA D12-D16).
 *
 * The Prisma schema declares enum types (UserRole, OrderStatus, PaymentStatus,
 * InventoryStatus, KotStation) but the corresponding columns are still typed
 * as String to keep the existing routes type-clean. Until the columns are
 * migrated, every write site MUST validate the inbound string against these
 * Zod enums so the DB never accumulates garbage values like "complete" or
 * "Pending ".
 *
 * Usage:
 *   import { OrderStatusEnum } from '../utils/enums';
 *   const status = OrderStatusEnum.parse(req.body.status);
 *   await prisma.order.update({ where:{id}, data:{ status } });
 */
import { z } from 'zod';

export const UserRoleEnum = z.enum([
  'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER', 'RIDER', 'STAFF',
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const OrderStatusEnum = z.enum([
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED',
  'COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const PaymentStatusEnum = z.enum([
  'PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'FAILED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const InventoryStatusEnum = z.enum([
  'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED',
]);
export type InventoryStatus = z.infer<typeof InventoryStatusEnum>;

export const KotStationEnum = z.enum([
  'GRILL', 'FRYER', 'COLD', 'BAKERY', 'BEVERAGE', 'HOT', 'SALAD', 'DESSERT', 'MAIN',
]);
export type KotStation = z.infer<typeof KotStationEnum>;

export const KotStatusEnum = z.enum([
  'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED',
]);
export type KotStatus = z.infer<typeof KotStatusEnum>;

export const PaymentMethodEnum = z.enum([
  'CASH', 'CARD', 'WALLET', 'BANK_TRANSFER', 'STRIPE', 'OTHER', 'SPLIT',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const TableStatusEnum = z.enum([
  'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE',
]);
export type TableStatus = z.infer<typeof TableStatusEnum>;

export const DeliveryStatusEnum = z.enum([
  'PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED',
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

export const ShiftStatusEnum = z.enum(['OPEN', 'CLOSED', 'ON_BREAK']);
export type ShiftStatus = z.infer<typeof ShiftStatusEnum>;

export const QrSessionStatusEnum = z.enum(['ACTIVE', 'ORDERED', 'CLOSED', 'EXPIRED']);
export type QrSessionStatus = z.infer<typeof QrSessionStatusEnum>;

/** Map a free-form string to its canonical enum value or throw. */
export function assertEnum<T extends z.ZodEnum<any>>(schema: T, value: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ${label}: ${String(value)}. Allowed: ${schema.options.join(', ')}`);
  }
  return result.data;
}
