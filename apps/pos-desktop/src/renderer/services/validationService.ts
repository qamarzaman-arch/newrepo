import api from './api';

export const validationService = {
  /**
   * Validate manager PIN for sensitive operations (discounts, refunds, voids)
   * This should be done server-side to prevent client-side bypass
   */
  async validateManagerPin(pin: string, operation: string): Promise<boolean> {
    try {
      const response = await api.post('/auth/validate-pin', {
        pin,
        operation,
      });
      return response.data.data.valid === true;
    } catch (error) {
      console.error('PIN validation failed:', error);
      return false;
    }
  },

  /**
   * Validate card payment with payment gateway
   * This integrates with external payment processors
   */
  async validateCardPayment(amount: number, cardDetails?: { lastFour?: string }): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      const response = await api.post('/payments/validate-card', {
        amount,
        cardDetails,
      });
      return {
        success: true,
        transactionId: response.data.data.transactionId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Card payment validation failed',
      };
    }
  },
};
