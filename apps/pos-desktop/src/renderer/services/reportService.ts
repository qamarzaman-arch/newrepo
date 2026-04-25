import api from './api';

export const reportService = {
  getDailySales: (date?: string) => api.get('/reports/sales/daily', { params: { date } }),
  getShiftSummary: (params?: { cashierId?: string; startDate?: string; endDate?: string }) =>
    api.get('/reports/shift-summary', { params }),
  getMonthlySales: (range?: string) => api.get('/reports/sales/monthly', { params: { range } }),
  getTopSelling: (limit?: number, days?: number) =>
    api.get('/reports/products/top-selling', { params: { limit, days } }),
  getLowPerforming: (days?: number) =>
    api.get('/reports/products/low-performing', { params: { days } }),
  getTopCustomers: (limit?: number) =>
    api.get('/reports/customers/top', { params: { limit } }),
  getStaffPerformance: (days?: number) =>
    api.get('/reports/staff/performance', { params: { days } }),
  getInventoryValuation: () => api.get('/reports/inventory/valuation'),
  getExpenseSummary: (days?: number) =>
    api.get('/reports/expenses/summary', { params: { days } }),
  getProfitLoss: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/profit-loss', { params }),
};
