import { PrismaClient, Discount } from '@prisma/client';

const prisma = new PrismaClient();

export class DiscountService {
  static async getActiveDiscounts(): Promise<Discount[]> {
    const now = new Date();
    return await prisma.discount.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: now } }
            ]
          }
        ]
      }
    });
  }

  static isApplicable(discount: any, orderData: any): boolean {
    const now = new Date();
    const currentDay = now.getDay() || 7; // 1-7
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 1. Check days of week
    if (discount.daysOfWeek) {
      const allowedDays = discount.daysOfWeek.split(',').map(Number);
      if (!allowedDays.includes(currentDay)) return false;
    }

    // 2. Check time range
    if (discount.startTime && discount.endTime) {
      if (currentTime < discount.startTime || currentTime > discount.endTime) return false;
    }

    // 3. Check min value
    if (discount.minValue && orderData.subtotal < Number(discount.minValue)) return false;

    // 4. Check items/categories
    if (discount.applicableTo !== 'all') {
      const orderItemIds = orderData.items.map((i: any) => i.menuItemId);
      const discountItemIds = discount.itemIds ? discount.itemIds.split(',') : [];

      const hasMatchingItem = orderItemIds.some((id: string) => discountItemIds.includes(id));
      if (!hasMatchingItem) return false;
    }

    return true;
  }

  static calculateDiscount(discount: any, orderData: any): number {
    if (discount.type === 'percentage') {
      return orderData.subtotal * (discount.value / 100);
    } else if (discount.type === 'fixed') {
      return Math.min(discount.value, orderData.subtotal);
    }
    return 0;
  }
}
