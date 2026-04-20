import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface CommissionCalculation {
  userId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  commissionType: string;
}

export const commissionService = {
  /**
   * Calculate commission for an order based on user role
   */
  async calculateCommission(
    userId: string,
    orderId: string,
    orderAmount: number,
    userRole: string
  ): Promise<CommissionCalculation | null> {
    try {
      // Get commission settings
      const setting = await prisma.setting.findUnique({
        where: { key: `commission_${userRole.toLowerCase()}` },
      });

      let commissionPercent = 0;
      if (setting) {
        commissionPercent = parseFloat(setting.value);
      } else {
        // Default commissions by role
        switch (userRole) {
          case 'SERVER':
            commissionPercent = 5;
            break;
          case 'CASHIER':
            commissionPercent = 2;
            break;
          case 'RIDER':
            commissionPercent = 10;
            break;
          default:
            return null;
        }
      }

      if (commissionPercent === 0) {
        return null;
      }

      const commissionAmount = (orderAmount * commissionPercent) / 100;

      return {
        userId,
        orderId,
        orderAmount,
        commissionAmount,
        commissionType: `${commissionPercent}%`,
      };
    } catch (error) {
      logger.error('Failed to calculate commission:', error);
      return null;
    }
  },

  /**
   * Record commission for an order
   */
  async recordCommission(
    userId: string,
    orderId: string,
    orderAmount: number,
    userRole: string
  ): Promise<{ success: boolean; commissionAmount: number }> {
    try {
      const calculation = await this.calculateCommission(
        userId,
        orderId,
        orderAmount,
        userRole
      );

      if (!calculation || calculation.commissionAmount === 0) {
        return { success: true, commissionAmount: 0 };
      }

      // Update staff performance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.staffPerformance.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        create: {
          userId,
          date: today,
          ordersHandled: 1,
          totalSales: orderAmount,
          totalCommission: calculation.commissionAmount,
        },
        update: {
          ordersHandled: { increment: 1 },
          totalSales: { increment: orderAmount },
          totalCommission: { increment: calculation.commissionAmount },
        },
      });

      logger.info(`Commission: Recorded ${calculation.commissionAmount} for user ${userId}`);

      return { success: true, commissionAmount: calculation.commissionAmount };
    } catch (error) {
      logger.error('Failed to record commission:', error);
      return { success: false, commissionAmount: 0 };
    }
  },

  /**
   * Get commission summary for a date range
   */
  async getCommissionSummary(userId: string, startDate: Date, endDate: Date) {
    return prisma.staffPerformance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  },
};

export default commissionService;
