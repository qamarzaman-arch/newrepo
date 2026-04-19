import apiClient from './api';

export interface CreatePaymentIntentData {
  amount: number; // in cents
  currency?: string;
  orderId: string;
  customerEmail?: string;
  provider?: 'stripe' | 'square';
}

export interface ConfirmPaymentData {
  paymentIntentId: string;
  provider?: 'stripe' | 'square';
}

export interface RefundData {
  paymentIntentId: string;
  amount?: number; // partial refund amount in cents
  reason?: string;
  managerPin?: string;
  provider?: 'stripe' | 'square';
}

export const paymentGatewayService = {
  // Create payment intent
  createPaymentIntent: async (data: CreatePaymentIntentData) => {
    return apiClient.post('/payment-gateway/create-intent', data);
  },

  // Confirm payment
  confirmPayment: async (data: ConfirmPaymentData) => {
    return apiClient.post('/payment-gateway/confirm', data);
  },

  // Process refund
  processRefund: async (data: RefundData) => {
    return apiClient.post('/payment-gateway/refund', data);
  },

  // Get saved payment methods
  getPaymentMethods: async (customerId: string, provider: 'stripe' | 'square' = 'stripe') => {
    return apiClient.get(`/payment-gateway/methods/${customerId}?provider=${provider}`);
  },

  // Check payment status
  getPaymentStatus: async (paymentIntentId: string, provider: 'stripe' | 'square' = 'stripe') => {
    return apiClient.get(`/payment-gateway/status/${paymentIntentId}?provider=${provider}`);
  },
};

export default paymentGatewayService;
