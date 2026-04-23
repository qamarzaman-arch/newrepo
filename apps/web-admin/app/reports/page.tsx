'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Calendar, Download } from 'lucide-react';
import apiClient from '../lib/api';

interface SalesReport {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

interface TopItem {
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, topItem: '-' });

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const rangeDays = parseInt(dateRange.replace('d', ''), 10) || 7;
        const [salesRes, topRes, staffRes] = await Promise.allSettled([
          apiClient.get(`/reports/sales/monthly?range=${rangeDays}`),
          apiClient.get(`/reports/products/top-selling?limit=10&days=${rangeDays}`),
          apiClient.get('/reports/staff/performance'),
        ]);

        if (salesRes.status === 'fulfilled') {
          setSalesData(salesRes.value.data.data?.dailySales || []);
          const data = salesRes.value.data.data || {};
          setSummary({
            totalRevenue: data.totalRevenue || 0,
            totalOrders: data.totalOrders || 0,
            avgOrderValue: data.totalOrders ? (data.totalRevenue || 0) / data.totalOrders : 0,
            topItem: '-',
          });
        }
        if (topRes.status === 'fulfilled') {
          const items = topRes.value.data.data?.items || [];
          setTopItems(items);
          setSummary((current) => ({
            ...current,
            topItem: items[0]?.name || '-',
          }));
        }
        if (staffRes.status === 'fulfilled') {
          setStaffPerformance(staffRes.value.data.data?.performances || []);
        }
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [dateRange]);

  const handleExport = () => {
    const csv = [
      ['Date', 'Revenue', 'Orders', 'Avg Order Value'].join(','),
      ...salesData.map(d => [d.date, d.revenue, d.orders, d.avgOrderValue].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange}.csv`;
    a.click();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-2 text-lg">Sales and performance analytics</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-xl font-semibold bg-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-green-50">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Total Revenue</p>
          <p className="text-3xl font-black text-gray-900 mt-1">${(summary.totalRevenue || 0).toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-blue-50">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Total Orders</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{summary.totalOrders}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-purple-50">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Avg Order Value</p>
          <p className="text-3xl font-black text-gray-900 mt-1">${(summary.avgOrderValue || 0).toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-orange-50">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Top Item</p>
          <p className="text-xl font-black text-gray-900 mt-1 truncate">{topItems[0]?.name || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-50">
          <h2 className="text-2xl font-extrabold flex items-center gap-3 text-gray-900 mb-6">
            <TrendingUp className="text-indigo-600" />
            Daily Sales
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {salesData.slice(0, 10).map((day, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="font-semibold text-gray-700">{day.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">${day.revenue.toFixed(2)}</span>
                    <span className="text-gray-500 text-sm ml-2">({day.orders} orders)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-50">
          <h2 className="text-2xl font-extrabold flex items-center gap-3 text-gray-900 mb-6">
            <Package className="text-indigo-600" />
            Top Selling Items
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {topItems.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center">{i + 1}</span>
                    <span className="font-semibold text-gray-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{item.totalQuantity} sold</span>
                    <span className="text-green-600 text-sm ml-2">${item.totalRevenue?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-50">
        <h2 className="text-2xl font-extrabold flex items-center gap-3 text-gray-900 mb-6">
          <Users className="text-indigo-600" />
          Staff Performance
        </h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : staffPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-bold uppercase text-sm">Staff</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-bold uppercase text-sm">Role</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-bold uppercase text-sm">Orders</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-bold uppercase text-sm">Revenue</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-bold uppercase text-sm">Rating</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((staff: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">{staff.name || staff.userId}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{staff.role || 'Staff'}</td>
                    <td className="py-3 px-4 text-right font-semibold">{staff.ordersHandled || 0}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">${(staff.revenue || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">{staff.rating?.toFixed(1) || 'N/A'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">No staff performance data available</div>
        )}
      </div>
    </div>
  );
}
