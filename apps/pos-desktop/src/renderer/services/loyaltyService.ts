import apiClient from './api';

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  points: number;
  reason: string;
  referenceId?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface LoyaltyPointsData {
  points: number;
  reason: string;
  referenceId?: string;
}

export const loyaltyService = {
  // Get loyalty transactions for a customer
  getTransactions: async (customerId: string, limit = 20) => {
    return apiClient.get(`/customers/${customerId}/loyalty?limit=${limit}`);
  },

  // Add/deduct loyalty points
  updatePoints: async (customerId: string, data: LoyaltyPointsData) => {
    return apiClient.post(`/customers/${customerId}/loyalty`, data);
  },

  // Calculate points for an order amount (1 point per $10 spent)
  calculatePoints: (amount: number): number => {
    return Math.floor(amount / 10);
  },

  // Redeem points (100 points = $1)
  calculateRedemptionValue: (points: number): number => {
    return points / 100;
  },

  // Auto-award points for order completion
  awardOrderPoints: async (customerId: string, orderAmount: number, orderId: string) => {
    const points = loyaltyService.calculatePoints(orderAmount);
    if (points > 0) {
      return loyaltyService.updatePoints(customerId, {
        points,
        reason: `Order completed: ${orderId}`,
        referenceId: orderId,
      });
    }
  },

  // Redeem points for discount
  redeemPoints: async (customerId: string, points: number, orderId: string) => {
    return loyaltyService.updatePoints(customerId, {
      points: -points,
      reason: `Points redeemed for order: ${orderId}`,
      referenceId: orderId,
    });
  },
};

export default loyaltyService;
