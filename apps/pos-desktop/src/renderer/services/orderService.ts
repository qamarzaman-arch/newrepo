import api from './api';
import { getOfflineQueueManager } from './offlineQueueManager';

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifiers?: string;
}

export interface CreateOrderData {
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | 'RESERVATION';
  tableId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  discountCode?: string;
  discountPercent?: number;
  discountAmount?: number;
  tipAmount?: number;
  notes?: string;
  kitchenNotes?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  data?: {
    order?: any;
    queued?: boolean;
    queueId?: string;
    message?: string;
  };
  queued?: boolean;
  queueId?: string;
  error?: {
    message?: string;
    code?: string;
  };
  isOfflineQueued?: boolean;
}

function isRetryableError(error: any): boolean {
  if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNABORTED') {
    return true;
  }
  if (error?.response?.status) {
    const status = error.response.status;
    return status >= 500 || status === 429;
  }
  return true;
}

export const orderService = {
  getOrders: (params?: { status?: string; orderType?: string; page?: number; limit?: number }) =>
    api.get('/orders', { params }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  
  createOrder: async (data: CreateOrderData, paymentData?: {
    method: string;
    amount: number;
    cashReceived?: number;
    cardLastFour?: string;
    transferReference?: string;
    splitPayments?: Array<{ method: string; amount: number }>;
    notes?: string;
  }): Promise<CreateOrderResponse> => {
    const offlineManager = getOfflineQueueManager();
    const queueStatus = offlineManager.getQueueStatus();
    
    if (!queueStatus.isOnline) {
      console.log('[OrderService] Offline - queueing order');
      const queueId = offlineManager.addToQueue(data, paymentData ? {
        method: paymentData.method as 'CASH' | 'CARD' | 'SPLIT',
        amount: paymentData.amount,
        cashReceived: paymentData.cashReceived,
        splitPayments: paymentData.splitPayments,
        notes: paymentData.notes,
      } : undefined);
      
      return {
        success: true,
        queued: true,
        queueId,
        isOfflineQueued: true,
        error: undefined,
      };
    }
    
    try {
      const orderResponse = await api.post('/orders', data);
      
      if (paymentData && orderResponse.data.data?.order?.id) {
        const orderId = orderResponse.data.data.order.id;
        await api.post(`/orders/${orderId}/payment`, {
          method: paymentData.method,
          amount: paymentData.amount,
          cashReceived: paymentData.cashReceived,
          cardLastFour: paymentData.cardLastFour,
          transferReference: paymentData.transferReference,
          notes: paymentData.notes,
        });
      }
      
      return {
        success: true,
        data: orderResponse.data.data,
        queued: false,
        isOfflineQueued: false,
      };
    } catch (error: any) {
      if (isRetryableError(error)) {
        console.log('[OrderService] Retryable error - queueing order for later');
        const queueId = offlineManager.addToQueue(data, paymentData ? {
          method: paymentData.method as 'CASH' | 'CARD' | 'SPLIT',
          amount: paymentData.amount,
          cashReceived: paymentData.cashReceived,
          splitPayments: paymentData.splitPayments,
          notes: paymentData.notes,
        } : undefined);
        
        return {
          success: true,
          queued: true,
          queueId,
          isOfflineQueued: true,
          error: {
            message: 'Order queued for sync when connection is restored',
            code: error?.code || 'RETRYABLE_ERROR',
          },
        };
      }
      
      return {
        success: false,
        queued: false,
        isOfflineQueued: false,
        error: {
          message: error?.response?.data?.message || error?.message || 'Failed to create order',
          code: error?.code || 'UNKNOWN_ERROR',
        },
      };
    }
  },
  
  updateOrder: (id: string, data: Partial<CreateOrderData>) => api.put(`/orders/${id}`, data),
  deleteOrder: (id: string) => api.delete(`/orders/${id}`),
  updateStatus: (id: string, status: string, cancelReason?: string) =>
    api.patch(`/orders/${id}/status`, { status, cancelReason }),
  processPayment: (id: string, paymentData: { 
    method: string; 
    amount: number; 
    reference?: string; 
    notes?: string;
    cashReceived?: number;
    cardLastFour?: string;
    transferReference?: string;
    discountAmount?: number;
    discountPercent?: number;
  }) => api.post(`/orders/${id}/payment`, paymentData),
  getReservations: (params?: { date?: string; status?: string }) =>
    api.get('/orders/reservations', { params }),
  createReservation: (data: any) => api.post('/orders/reservations', data),
  updateReservation: (id: string, data: any) => api.put(`/orders/reservations/${id}`, data),
  cancelReservation: (id: string) => api.delete(`/orders/reservations/${id}`),
  refundOrder: (id: string, data: {
    type: 'FULL' | 'PARTIAL';
    reason: string;
    amount: number;
    items?: string[];
    managerPin: string;
    approvedBy: string;
    processedBy?: string;
    refundMethod?: string;
    originalPaymentMethod?: string;
  }) => api.post(`/orders/${id}/refund`, data),
};
