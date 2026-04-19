import apiClient from './api';

export interface CashDrawer {
  id: string;
  sessionNumber: string;
  openedById: string;
  closedById?: string;
  openingBalance: number;
  openedAt: string;
  closingBalance?: number;
  expectedBalance?: number;
  discrepancy?: number;
  closedAt?: string;
  closingNotes?: string;
  totalSales: number;
  totalCashIn: number;
  totalCashOut: number;
  transactionCount: number;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  openedBy?: {
    id: string;
    fullName: string;
    username: string;
  };
  closedBy?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface OpenCashDrawerData {
  openingBalance: number;
}

export interface CloseCashDrawerData {
  closingBalance: number;
  closingNotes?: string;
  expectedBalance: number;
}

export interface CashDrawerTransaction {
  type: 'cash_in' | 'cash_out' | 'sale' | 'refund';
  amount: number;
}

export const cashDrawerService = {
  // Get current open cash drawer
  getCurrent: async () => {
    return apiClient.get('/cash-drawer/current');
  },

  // Get cash drawer history
  getHistory: async (limit = 10, offset = 0) => {
    return apiClient.get(`/cash-drawer/history?limit=${limit}&offset=${offset}`);
  },

  // Open cash drawer (start shift)
  open: async (data: OpenCashDrawerData) => {
    return apiClient.post('/cash-drawer/open', data);
  },

  // Close cash drawer (end shift)
  close: async (id: string, data: CloseCashDrawerData) => {
    return apiClient.post(`/cash-drawer/${id}/close`, data);
  },

  // Record transaction
  recordTransaction: async (id: string, data: CashDrawerTransaction) => {
    return apiClient.patch(`/cash-drawer/${id}/transaction`, data);
  },
};

export default cashDrawerService;
