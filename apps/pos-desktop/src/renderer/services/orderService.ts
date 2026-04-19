import api from './api';

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
  createOrder: (data: CreateOrderData) => api.post('/orders', data),
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
