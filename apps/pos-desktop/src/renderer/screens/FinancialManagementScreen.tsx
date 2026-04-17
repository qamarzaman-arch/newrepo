import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, PieChart,
  CreditCard, FileText, Calculator, Plus, Search,
  Filter, Download, ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';

const FinancialManagementScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'taxes' | 'budget'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { formatCurrency } = useCurrencyFormatter();

  // Mock financial data
  const financialStats = {
    totalRevenue: 45678.90,
    totalExpenses: 28934.50,
    netProfit: 16744.40,
    profitMargin: 36.7,
    taxCollected: 3892.45,
    pendingPayments: 2450.00,
  };

  // Mock expenses
  const expenses = [
    { id: 'EXP-001', category: 'Inventory', description: 'Fresh produce delivery', amount: 450.00, date: '2024-01-18', status: 'PAID', paymentMethod: 'Bank Transfer' },
    { id: 'EXP-002', category: 'Utilities', description: 'Electricity bill - January', amount: 320.50, date: '2024-01-17', status: 'PAID', paymentMethod: 'Credit Card' },
    { id: 'EXP-003', category: 'Staff', description: 'Weekly payroll', amount: 3200.00, date: '2024-01-15', status: 'PAID', paymentMethod: 'Bank Transfer' },
    { id: 'EXP-004', category: 'Rent', description: 'Monthly rent - January', amount: 2500.00, date: '2024-01-01', status: 'PENDING', paymentMethod: 'Check' },
    { id: 'EXP-005', category: 'Marketing', description: 'Social media ads', amount: 150.00, date: '2024-01-10', status: 'PAID', paymentMethod: 'Credit Card' },
  ];

  // Mock tax records
  const taxRecords = [
    { id: 'TAX-001', period: 'Q4 2023', type: 'Sales Tax', amount: 3892.45, status: 'FILED', dueDate: '2024-01-31', filedDate: '2024-01-15' },
    { id: 'TAX-002', period: 'Q3 2023', type: 'Sales Tax', amount: 3654.20, status: 'FILED', dueDate: '2023-10-31', filedDate: '2023-10-28' },
    { id: 'TAX-003', period: 'Annual 2023', type: 'Income Tax', amount: 12450.00, status: 'PENDING', dueDate: '2024-04-15', filedDate: null },
  ];

  // Mock budget data
  const budgets = [
    { category: 'Inventory', allocated: 15000, spent: 12450, remaining: 2550, percentage: 83 },
    { category: 'Staff', allocated: 20000, spent: 18200, remaining: 1800, percentage: 91 },
    { category: 'Utilities', allocated: 2000, spent: 1450, remaining: 550, percentage: 72.5 },
    { category: 'Marketing', allocated: 1000, spent: 650, remaining: 350, percentage: 65 },
    { category: 'Maintenance', allocated: 1500, spent: 890, remaining: 610, percentage: 59.3 },
  ];

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
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Download className="w-5 h-5" />
            Export Report
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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

          <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
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
                  <div className="bg-red-600 h-3 rounded-full" style={{ width: '63%' }}></div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-blue-700 font-semibold">Net Profit</span>
                  <span className="text-2xl font-bold text-blue-700">{formatCurrency(financialStats.netProfit)}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '36.7%' }}></div>
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
              {[
                { method: 'Cash', amount: 18450.00, percentage: 40.4, color: 'bg-green-500' },
                { method: 'Credit Card', amount: 15230.50, percentage: 33.3, color: 'bg-blue-500' },
                { method: 'Debit Card', amount: 8920.40, percentage: 19.5, color: 'bg-purple-500' },
                { method: 'Digital Wallet', amount: 3078.00, percentage: 6.8, color: 'bg-orange-500' },
              ].map((payment, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${payment.color}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">{payment.method}</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${payment.color} h-2 rounded-full`}
                        style={{ width: `${payment.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{payment.percentage}%</span>
                </div>
              ))}
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
          {taxRecords.map((tax, index) => (
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
          ))}
        </div>
      )}

      {/* BUDGET TAB */}
      {activeTab === 'budget' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget, index) => (
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
          ))}
        </div>
      )}
    </div>
  );
};

export default FinancialManagementScreen;
