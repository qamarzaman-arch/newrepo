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

export const orderService = {
  getOrders: (params?: { status?: string; orderType?: string; page?: number; limit?: number }) =>
    api.get('/orders', { params }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  
  // Enhanced createOrder with offline support
  createOrder: async (data: CreateOrderData, paymentData?: {
    method: string;
    amount: number;
    cashReceived?: number;
    cardLastFour?: string;
    transferReference?: string;
    splitPayments?: Array<{ method: string; amount: number }>;
    notes?: string;
  }) => {
    const offlineManager = getOfflineQueueManager();
    const queueStatus = offlineManager.getQueueStatus();
    
    // If offline or queue has pending items, add to queue
    if (!queueStatus.isOnline || queueStatus.pending > 0) {
      console.log('Adding order to offline queue');
      const queueId = offlineManager.addToQueue(data, paymentData ? {
        method: paymentData.method as any,
        amount: paymentData.amount,
        cashReceived: paymentData.cashReceived,
        splitPayments: paymentData.splitPayments,
        notes: paymentData.notes,
      } : undefined);
      
      // Return a mock response for offline mode
      return {
        data: {
          success: true,
          data: {
            order: {
              id: queueId,
              status: 'OFFLINE_QUEUED',
              ...data,
            },
            queued: true,
            queueId,
          },
        },
      };
    }
    
    // Online mode - direct API call
    try {
      const orderResponse = await api.post('/orders', data);
      
      // If payment data provided, process payment immediately
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
      
      return orderResponse;
    } catch (error) {
      // If API fails, add to offline queue
      console.log('API call failed, adding to offline queue');
      const queueId = offlineManager.addToQueue(data, paymentData ? {
        method: paymentData.method as any,
        amount: paymentData.amount,
        cashReceived: paymentData.cashReceived,
        splitPayments: paymentData.splitPayments,
        notes: paymentData.notes,
      } : undefined);
      
      return {
        data: {
          success: true,
          data: {
            order: {
              id: queueId,
              status: 'OFFLINE_QUEUED',
              ...data,
            },
            queued: true,
            queueId,
          },
        },
      };
    }
  },
  
  updateOrder: (id: string, data: Partial<CreateOrderData>) => api.put(`/orders/${id}`, data),
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
