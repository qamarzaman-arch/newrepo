import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, PieChart,
  CreditCard, FileText, Calculator, Plus, Search,
  Filter, Download, ArrowUpRight, ArrowDownRight, Wallet, X, Calendar
} from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { expenseService } from '../services/expenseService';
import toast from 'react-hot-toast';

const FinancialManagementScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'taxes' | 'budget'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [expenseForm, setExpenseForm] = useState({
    category: 'inventory',
    description: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
  });
  const { formatCurrency } = useCurrencyFormatter();

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const { data: expenseData } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await expenseService.getExpenses();
      return response.data.data;
    },
  });

  const financialStats = {
    totalRevenue: dailySales?.totalRevenue || 0,
    totalExpenses: expenseData?.totalExpenses || 0,
    netProfit: (dailySales?.totalRevenue || 0) - (expenseData?.totalExpenses || 0),
    profitMargin: dailySales?.totalRevenue ? (((dailySales.totalRevenue - (expenseData?.totalExpenses || 0)) / dailySales.totalRevenue) * 100) : 0,
    taxCollected: (dailySales?.totalRevenue || 0) * 0.1,
    pendingPayments: 0,
  };

  const expenses = expenseData?.expenses || [];
  const paymentBreakdownEntries = Object.entries(dailySales?.paymentMethodBreakdown || {});
  // Calculate dynamic tax records from sales data
  const taxRecords = dailySales?.taxBreakdown ? Object.entries(dailySales.taxBreakdown).map(([type, amount], index) => ({
    id: `tax-${index}`,
    period: 'Current Period',
    type: type,
    amount: Number(amount),
    dueDate: new Date().toISOString().split('T')[0],
    filedDate: null,
    status: 'PENDING'
  })) : [];

  // Calculate budgets from expense categories
  const budgets: Array<{ category: string; allocated: number; spent: number; remaining: number; percentage: number }> = 
    expenseData?.categories ? expenseData.categories.map((cat: any) => ({
      category: cat.category,
      allocated: (cat._sum?.amount || 0) * 1.2,
      spent: cat._sum?.amount || 0,
      remaining: ((cat._sum?.amount || 0) * 1.2) - (cat._sum?.amount || 0),
      percentage: Math.min(100, Math.round(((cat._sum?.amount || 0) / ((cat._sum?.amount || 0) * 1.2)) * 100))
    })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Financial Management</h1>
          <p className="text-gray-600 mt-1">Track expenses, taxes, and manage budgets</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Report
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddExpenseModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialStats.totalRevenue)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <ArrowDownRight className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialStats.totalExpenses)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-sm border border-green-200"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700">Net Profit</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(financialStats.netProfit)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Profit Margin</p>
            <PieChart className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{financialStats.profitMargin}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Tax Collected</p>
            <Calculator className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(financialStats.taxCollected)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Pending Payments</p>
            <Wallet className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(financialStats.pendingPayments)}</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'expenses', label: 'Expenses', icon: DollarSign },
          { id: 'taxes', label: 'Taxes', icon: FileText },
          { id: 'budget', label: 'Budget', icon: PieChart },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Filters - Only for Expenses tab */}
      {activeTab === 'expenses' && (
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
          >
            <option value="all">All Categories</option>
            <option value="inventory">Inventory</option>
            <option value="utilities">Utilities</option>
            <option value="staff">Staff</option>
            <option value="rent">Rent</option>
            <option value="marketing">Marketing</option>
          </select>

          <button onClick={() => setShowFilterModal(true)} className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Revenue vs Expenses
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-green-700 font-semibold">Revenue</span>
                  <span className="text-2xl font-bold text-green-700">{formatCurrency(financialStats.totalRevenue)}</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-3">
                  <div className="bg-green-600 h-3 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-red-700 font-semibold">Expenses</span>
                  <span className="text-2xl font-bold text-red-700">{formatCurrency(financialStats.totalExpenses)}</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-3">
                  <div className="bg-red-600 h-3 rounded-full" style={{ width: `${financialStats.totalRevenue > 0 ? Math.min(100, (financialStats.totalExpenses / financialStats.totalRevenue) * 100) : 0}%` }}></div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-blue-700 font-semibold">Net Profit</span>
                  <span className="text-2xl font-bold text-blue-700">{formatCurrency(financialStats.netProfit)}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${financialStats.totalRevenue > 0 ? Math.max(0, ((financialStats.totalRevenue - financialStats.totalExpenses) / financialStats.totalRevenue) * 100) : 0}%` }}></div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment Methods
            </h3>
            <div className="space-y-3">
              {paymentBreakdownEntries.length > 0 ? paymentBreakdownEntries.map(([method, amount], index) => {
                const numericAmount = Number(amount);
                const percentage = financialStats.totalRevenue > 0 ? (numericAmount / financialStats.totalRevenue) * 100 : 0;
                const color = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500'][index % 4];
                return (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">{method}</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(numericAmount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${color} h-2 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{percentage.toFixed(1)}%</span>
                </div>
              );
              }) : (
                <div className="text-sm text-gray-500">No payment data available</div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Expense ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{expense.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{expense.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{expense.description}</td>
                  <td className="px-6 py-4 font-bold text-red-600">-{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{expense.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      expense.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{expense.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAXES TAB */}
      {activeTab === 'taxes' && (
        <div className="space-y-4">
          {taxRecords.length > 0 ? taxRecords.map((tax, index) => (
            <motion.div
              key={tax.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    tax.status === 'FILED' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <FileText className={`w-8 h-8 ${
                      tax.status === 'FILED' ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{tax.period}</h3>
                    <p className="text-sm text-gray-500">{tax.type}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>Due: {tax.dueDate}</span>
                      {tax.filedDate && <span>Filed: {tax.filedDate}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(tax.amount)}</p>
                  <span className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    tax.status === 'FILED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tax.status}
                  </span>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-gray-500">
              No tax filings available from live data.
            </div>
          )}
        </div>
      )}

      {/* BUDGET TAB */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.length > 0 ? budgets.map((budget, index) => (
            <motion.div
              key={budget.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{budget.category}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  budget.percentage >= 90 ? 'bg-red-100 text-red-700' :
                  budget.percentage >= 75 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {budget.percentage}% used
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-semibold">{formatCurrency(budget.allocated)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Spent:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(budget.spent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(budget.remaining)}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budget.percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`h-3 rounded-full ${
                      budget.percentage >= 90 ? 'bg-red-500' :
                      budget.percentage >= 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-gray-500">
              {expenses.length === 0 ? 'No expenses recorded yet. Add expenses to see budget tracking.' : 'Add more expense categories to enable budget tracking.'}
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Expense</h2>
                <button onClick={() => setShowAddExpenseModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select 
                    value={expenseForm.category} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl"
                  >
                    <option value="inventory">Inventory</option>
                    <option value="utilities">Utilities</option>
                    <option value="staff">Staff</option>
                    <option value="rent">Rent</option>
                    <option value="marketing">Marketing</option>
                    <option value="equipment">Equipment</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <input 
                    type="text" 
                    value={expenseForm.description} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" 
                    placeholder="Enter expense description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={expenseForm.amount} 
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" 
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                    <select 
                      value={expenseForm.paymentMethod} 
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Check">Check</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea 
                    value={expenseForm.notes} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" 
                    rows={3} 
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddExpenseModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!expenseForm.description || !expenseForm.amount) {
                      toast.error('Please fill in all required fields');
                      return;
                    }
                    try {
                      await expenseService.createExpense({
                        category: expenseForm.category,
                        description: expenseForm.description,
                        amount: parseFloat(expenseForm.amount),
                        paymentMethod: expenseForm.paymentMethod,
                        notes: expenseForm.notes,
                      });
                      toast.success('Expense added successfully');
                      setShowAddExpenseModal(false);
                      setExpenseForm({ category: 'inventory', description: '', amount: '', paymentMethod: 'Cash', notes: '' });
                      queryClient.invalidateQueries({ queryKey: ['expenses'] });
                    } catch (error) {
                      toast.error('Failed to add expense');
                    }
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold"
                >
                  Add Expense
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Report Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Export Report</h2>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-gray-600">Choose export format for your financial report:</p>
                <div className="space-y-2">
                  {['csv', 'pdf', 'excel'].map((format) => (
                    <button
                      key={format}
                      onClick={() => setExportFormat(format as any)}
                      className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                        exportFormat === format 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        exportFormat === format ? 'border-primary' : 'border-gray-300'
                      }`}>
                        {exportFormat === format && <div className="w-3 h-3 bg-primary rounded-full" />}
                      </div>
                      <span className="font-semibold capitalize">{format.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    // Generate and download report
                    const data = {
                      revenue: financialStats.totalRevenue,
                      expenses: financialStats.totalExpenses,
                      profit: financialStats.netProfit,
                      margin: financialStats.profitMargin,
                      generatedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
                    setShowExportModal(false);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold"
                >
                  Export
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Filter Expenses</h2>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <div className="space-y-2">
                  {['all', 'inventory', 'utilities', 'staff', 'rent', 'marketing'].map((cat) => (
                    <label key={cat} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input 
                        type="radio" 
                        name="categoryFilter" 
                        value={cat}
                        checked={categoryFilter === cat}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="capitalize">{cat === 'all' ? 'All Categories' : cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date Range</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFilterModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                Cancel
              </button>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FinancialManagementScreen;
