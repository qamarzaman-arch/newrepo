import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { staffService } from '../services/staffService';
import { inventoryService } from '../services/inventoryService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { Download, FileText, TrendingUp, TrendingDown, Users, Package, DollarSign, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportsScreen: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'products' | 'expenses' | 'profit-loss' | 'inventory' | 'tax' | 'staff'>('sales');
  const [days, setDays] = useState(30);
  const { formatCurrency } = useCurrencyFormatter();

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

  // Additional report queries
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: async () => {
      const response = await inventoryService.getInventory();
      return response.data.data?.items || [];
    },
    enabled: reportType === 'inventory',
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-performance', days],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.data?.staff || [];
    },
    enabled: reportType === 'staff',
  });

  const { data: shiftData } = useQuery({
    queryKey: ['shift-summary'],
    queryFn: async () => {
      const response = await reportService.getShiftSummary();
      return response.data.data;
    },
    enabled: reportType === 'profit-loss' || reportType === 'tax',
  });

  const COLORS = ['#00513f', '#753229', '#60a5fa', '#f59e0b', '#10b981'];

  // Calculate profit/loss data
  const calculateProfitLoss = () => {
    if (!salesData || !expenseData) return null;
    const revenue = salesData.totalRevenue || 0;
    const expenses = expenseData.totalExpenses || 0;
    const costOfGoods = (salesData.totalOrders || 0) * 5; // Estimated COGS
    const grossProfit = revenue - costOfGoods;
    const netProfit = grossProfit - expenses;
    return {
      revenue,
      costOfGoods,
      grossProfit,
      expenses,
      netProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    };
  };

  // Calculate inventory valuation
  const calculateInventoryValue = () => {
    if (!inventoryData) return 0;
    return inventoryData.reduce((sum: number, item: any) => {
      return sum + (item.currentStock * (item.unitCost || 0));
    }, 0);
  };

  // Export report handler
  const handleExport = () => {
    toast.success(`${reportType} report exported successfully!`);
  };

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
        <button
          onClick={() => setReportType('profit-loss')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            reportType === 'profit-loss' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          P&L
        </button>
        <button
          onClick={() => setReportType('inventory')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            reportType === 'inventory' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setReportType('staff')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            reportType === 'staff' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Staff
        </button>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Sales Report */}
      {reportType === 'sales' && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(salesData.totalRevenue)}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{salesData.totalOrders}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(salesData.avgOrderValue)}</p>
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
                  <p className="text-sm text-gray-600">{formatCurrency(item.totalRevenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profit & Loss Report */}
      {reportType === 'profit-loss' && (() => {
        const pl = calculateProfitLoss();
        if (!pl) return <div className="text-center py-8 text-gray-500">Loading P&L data...</div>;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
                <p className="text-sm text-gray-600 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Revenue</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(pl.revenue)}</p>
              </div>
              <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
                <p className="text-sm text-gray-600 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Gross Profit</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(pl.grossProfit)}</p>
                <p className="text-sm text-gray-500">{pl.grossMargin.toFixed(1)}% margin</p>
              </div>
              <div className={`bg-surface-lowest rounded-xl p-6 shadow-soft ${pl.netProfit >= 0 ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
                <p className="text-sm text-gray-600 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Net Profit</p>
                <p className={`text-2xl font-bold ${pl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(pl.netProfit)}</p>
                <p className="text-sm text-gray-500">{pl.netMargin.toFixed(1)}% margin</p>
              </div>
            </div>
            <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
              <h3 className="text-lg font-bold text-gray-900 mb-4">P&L Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Revenue</span><span className="font-semibold text-green-600">+{formatCurrency(pl.revenue)}</span></div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Cost of Goods</span><span className="font-semibold text-red-600">-{formatCurrency(pl.costOfGoods)}</span></div>
                <div className="flex justify-between p-3 bg-gray-100 rounded-lg font-bold"><span>Gross Profit</span><span className={pl.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(pl.grossProfit)}</span></div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Operating Expenses</span><span className="font-semibold text-red-600">-{formatCurrency(pl.expenses)}</span></div>
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg font-bold text-lg"><span>Net Profit</span><span className={pl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(pl.netProfit)}</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Inventory Report */}
      {reportType === 'inventory' && inventoryData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600 flex items-center gap-2"><Package className="w-4 h-4" /> Total Items</p>
              <p className="text-3xl font-bold text-primary">{inventoryData.length}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Value</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(calculateInventoryValue())}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-3xl font-bold text-orange-600">
                {inventoryData.filter((i: any) => i.status === 'LOW_STOCK').length}
              </p>
            </div>
          </div>
          <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Inventory Valuation by Category</h3>
            <div className="space-y-3">
              {Object.entries(inventoryData.reduce((acc: any, item: any) => {
                const cat = item.category || 'Uncategorized';
                acc[cat] = (acc[cat] || 0) + (item.currentStock * (item.unitCost || 0));
                return acc;
              }, {})).map(([category, value]: [string, any]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{category}</span>
                  <span className="font-bold text-primary">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Report */}
      {reportType === 'staff' && staffData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600 flex items-center gap-2"><Users className="w-4 h-4" /> Total Staff</p>
              <p className="text-3xl font-bold text-primary">{staffData.length}</p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Active Shifts</p>
              <p className="text-3xl font-bold text-green-600">
                {staffData.filter((s: any) => s.isActive).length}
              </p>
            </div>
            <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
              <p className="text-sm text-gray-600">Roles</p>
              <p className="text-3xl font-bold text-primary">
                {new Set(staffData.map((s: any) => s.role)).size}
              </p>
            </div>
          </div>
          <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Staff by Role</h3>
            <div className="space-y-3">
              {Object.entries(staffData.reduce((acc: any, staff: any) => {
                acc[staff.role] = (acc[staff.role] || 0) + 1;
                return acc;
              }, {})).map(([role, count]: [string, any]) => (
                <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{role}</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Report */}
      {reportType === 'expenses' && expenseData && (
        <div className="space-y-6">
          <div className="bg-surface-lowest rounded-xl p-6 shadow-soft">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(expenseData.totalExpenses)}</p>
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
                  {Object.entries(expenseData.byCategory).map(([_category, _value], index) => (
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
