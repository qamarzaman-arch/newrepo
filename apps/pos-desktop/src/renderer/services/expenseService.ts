import api from './api';

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING';
  paymentMethod: string;
  vendorId?: string;
}

export interface CreateExpenseData {
  category: string;
  description: string;
  amount: number;
  date?: string;
  paymentMethod: string;
  vendorId?: string;
  notes?: string;
}

export const expenseService = {
  getExpenses: (params?: { category?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/expenses', { params }),
  getExpense: (id: string) => api.get(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  createExpense: (data: CreateExpenseData) => api.post('/expenses', data),
  updateExpense: (id: string, data: Partial<CreateExpenseData>) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
};