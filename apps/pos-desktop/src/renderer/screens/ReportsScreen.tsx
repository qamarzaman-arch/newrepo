import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ReportsScreen: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'products' | 'expenses'>('sales');
  const [days, setDays] = useState(30);

  const { data: salesData } = useQuery({
    queryKey: ['monthly-sales', days],
    queryFn: async () => {
      const response = await reportService.getMonthlySales(days.toString());
      return response.data.data;
    },
    enabled: reportType === 'sales',
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', days],
    queryFn: async () => {
      const response = await reportService.getTopSelling(10, days);
      return response.data.data.items;
    },
    enabled: reportType === 'products',
  });

  const { data: expenseData } = useQuery({
    queryKey: ['expense-summary', days],
    queryFn: async () => {
      const response = await reportService.getExpenseSummary(days);
      return response.data.data;
    },
    enabled: reportType === 'expenses',
  });

  const COLORS = ['#00513f', '#753229', '#60a5fa', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-surface-lowest rounded-2xl p-2 shadow-soft inline-flex">
        <button
          onClick={() => setReportType('sales')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            reportType === 'sales' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Sales
        </button>
        <button
          onClick={() => setReportType('products')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            reportType === 'products' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setReportType('expenses')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            reportType === 'expenses' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Expenses
        </button>
      </div>

      {/* Sales Report */}
      {reportType === 'sales' && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-primary">${salesData.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{salesData.totalOrders}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900">${salesData.avgOrderValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#00513f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Products Report */}
      {reportType === 'products' && topProducts && (
        <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {topProducts.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{item.totalQuantity} sold</p>
                  <p className="text-sm text-gray-600">${item.totalRevenue?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Report */}
      {reportType === 'expenses' && expenseData && (
        <div className="space-y-6">
          <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600">${expenseData.totalExpenses.toFixed(2)}</p>
          </div>

          <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(expenseData.byCategory).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(expenseData.byCategory).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsScreen;
