import api from './api';

export interface CommissionEntry {
  userId: string;
  userName: string;
  role: string;
  totalDeliveries: number;
  totalOrderValue: number;
  commissionRate: number;
  commissionAmount: number;
}

export interface CommissionReport {
  period: { start: string; end: string };
  totalCommission: number;
  report: CommissionEntry[];
}

export interface SetCommissionRateData {
  userId: string;
  rate: number;
  type?: 'DELIVERY' | 'SALES' | 'SERVICE';
  effectiveFrom: string;
  effectiveTo?: string;
}

export const commissionService = {
  calculate: (data: { userId: string; startDate: string; endDate: string }) =>
    api.post('/commissions/calculate', data),

  setRate: (data: SetCommissionRateData) => api.post('/commissions/rate', data),

  getHistory: (userId: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/commissions/history/${userId}`, { params }),

  getReport: (params: { startDate: string; endDate: string }) =>
    api.get('/commissions/report', { params }),
};

export default commissionService;
