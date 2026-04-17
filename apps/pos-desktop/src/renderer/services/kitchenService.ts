import api from './api';

export interface KotTicket {
  id: string;
  ticketNumber: string;
  orderId: string;
  course: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  priority: 'normal' | 'high' | 'urgent';
  orderedAt: string;
  startedAt?: string;
  completedAt?: string;
  station?: string;
  assignedTo?: string;
  notes?: string;
  order?: any;
}

export const kitchenService = {
  getTickets: (params?: { status?: string; course?: string; priority?: string }) =>
    api.get('/kitchen/tickets', { params }),
  getActiveTickets: () => api.get('/kitchen/tickets/active'),
  getStats: () => api.get('/kitchen/stats'),
  getTicket: (id: string) => api.get(`/kitchen/tickets/${id}`),
  updateStatus: (id: string, status: KotTicket['status']) =>
    api.patch(`/kitchen/tickets/${id}/status`, { status }),
  assignTicket: (id: string, data: { station?: string; assignedTo?: string }) =>
    api.patch(`/kitchen/tickets/${id}/assign`, data),
  markDelayed: (id: string, data: { reason: string; estimatedDelay?: number }) =>
    api.post(`/kitchen/tickets/${id}/delay`, data),
};
