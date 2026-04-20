import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface LoyaltyRule {
  id: string;
  name: string;
  pointsPerDollar: number;
  minSpend: number;
  isActive: boolean;
}

export interface LoyaltyCalculation {
  pointsEarned: number;
  newBalance: number;
}

export const loyaltyService = {
  /**
   * Calculate points earned for an order
   */
  async calculatePoints(customerId: string, orderAmount: number): Promise<LoyaltyCalculation> {
    // Get active loyalty rule
    const rule = await prisma.setting.findUnique({
      where: { key: 'loyalty_points_per_dollar' },
    });

    const pointsPerDollar = rule ? parseFloat(rule.value) : 1; // Default: 1 point per dollar
    const minSpendSetting = await prisma.setting.findUnique({
      where: { key: 'loyalty_min_spend' },
    });
    const minSpend = minSpendSetting ? parseFloat(minSpendSetting.value) : 0;

    if (orderAmount < minSpend) {
      return { pointsEarned: 0, newBalance: 0 };
    }

    const pointsEarned = Math.floor(orderAmount * pointsPerDollar);

    // Get current customer points
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    });

    const currentBalance = customer?.loyaltyPoints || 0;

    return {
      pointsEarned,
      newBalance: currentBalance + pointsEarned,
    };
  },

  /**
   * Award points to customer after order completion
   */
  async awardPoints(
    customerId: string,
    orderId: string,
    orderAmount: number
  ): Promise<{ success: boolean; pointsAwarded: number }> {
    try {
      const calculation = await this.calculatePoints(customerId, orderAmount);

      if (calculation.pointsEarned === 0) {
        return { success: true, pointsAwarded: 0 };
      }

      // Create loyalty transaction
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          points: calculation.pointsEarned,
          reason: `Order #${orderId}`,
          referenceId: orderId,
          balanceAfter: calculation.newBalance,
        },
      });

      // Update customer points
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: { increment: calculation.pointsEarned },
          totalSpent: { increment: orderAmount },
          totalOrders: { increment: 1 },
        },
      });

      logger.info(`Loyalty: Awarded ${calculation.pointsEarned} points to customer ${customerId}`);

      return { success: true, pointsAwarded: calculation.pointsEarned };
    } catch (error) {
      logger.error('Failed to award loyalty points:', error);
      return { success: false, pointsAwarded: 0 };
    }
  },

  /**
   * Redeem points for discount
   */
  async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
    orderId: string
  ): Promise<{ success: boolean; discountValue: number; remainingPoints: number }> {
    try {
      // Get customer current points
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { loyaltyPoints: true },
      });

      if (!customer || customer.loyaltyPoints < pointsToRedeem) {
        return { success: false, discountValue: 0, remainingPoints: customer?.loyaltyPoints || 0 };
      }

      // Get points value setting (default: 100 points = $1)
      const valueSetting = await prisma.setting.findUnique({
        where: { key: 'loyalty_points_value' },
      });
      const pointsValue = valueSetting ? parseFloat(valueSetting.value) : 0.01; // $0.01 per point

      const discountValue = pointsToRedeem * pointsValue;
      const remainingPoints = customer.loyaltyPoints - pointsToRedeem;

      // Create negative loyalty transaction
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          points: -pointsToRedeem,
          reason: `Redeemed for Order #${orderId}`,
          referenceId: orderId,
          balanceAfter: remainingPoints,
        },
      });

      // Update customer points
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: remainingPoints,
        },
      });

      logger.info(`Loyalty: Redeemed ${pointsToRedeem} points for customer ${customerId}`);

      return { success: true, discountValue, remainingPoints };
    } catch (error) {
      logger.error('Failed to redeem loyalty points:', error);
      return { success: false, discountValue: 0, remainingPoints: 0 };
    }
  },

  /**
   * Get customer loyalty summary
   */
  async getLoyaltySummary(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        loyaltyPoints: true,
        totalSpent: true,
        totalOrders: true,
      },
    });

    if (!customer) {
      return null;
    }

    // Get points value
    const valueSetting = await prisma.setting.findUnique({
      where: { key: 'loyalty_points_value' },
    });
    const pointsValue = valueSetting ? parseFloat(valueSetting.value) : 0.01;

    return {
      points: customer.loyaltyPoints,
      pointsValue: customer.loyaltyPoints * pointsValue,
      totalSpent: customer.totalSpent,
      totalOrders: customer.totalOrders,
      tier: this.calculateTier(customer.totalSpent),
    };
  },

  /**
   * Calculate customer tier based on total spent
   */
  calculateTier(totalSpent: number): string {
    if (totalSpent >= 1000) return 'PLATINUM';
    if (totalSpent >= 500) return 'GOLD';
    if (totalSpent >= 200) return 'SILVER';
    return 'BRONZE';
  },

  /**
   * Get loyalty transaction history
   */
  async getTransactionHistory(customerId: string, limit: number = 50) {
    return prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

export default loyaltyService;
