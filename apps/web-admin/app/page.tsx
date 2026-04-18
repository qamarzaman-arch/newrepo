'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, Users, DollarSign, Package, 
  ShoppingCart, TrendingUp, AlertTriangle, Activity
} from 'lucide-react';
import apiClient from './lib/api';

interface DailyReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  paymentBreakdown?: {
    cash: number;
    card: number;
  };
}

export default function Home() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [staffCount, setStaffCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const [reportRes, staffRes, lowStockRes, topItemsRes] = await Promise.allSettled([
          apiClient.get(`/reports/daily?date=${today}`),
          apiClient.get('/users'),
          apiClient.get('/inventory/low-stock'),
          apiClient.get('/reports/top-items?limit=5'),
        ]);

        if (reportRes.status === 'fulfilled') {
          setReport(reportRes.value.data?.data || null);
        }
        if (staffRes.status === 'fulfilled') {
          setStaffCount(staffRes.value.data?.data?.users?.length || 0);
        }
        if (lowStockRes.status === 'fulfilled') {
          setLowStockCount(lowStockRes.value.data?.data?.items?.length || 0);
        }
        if (topItemsRes.status === 'fulfilled') {
          setTopItems(topItemsRes.value.data?.data?.items || []);
        }
      } catch (err: any) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    { 
      label: 'Total Revenue Today', 
      value: loading ? '…' : `$${(report?.totalRevenue || 0).toFixed(2)}`, 
      icon: DollarSign, 
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    { 
      label: 'Orders Today', 
      value: loading ? '…' : String(report?.totalOrders || 0), 
      icon: ShoppingCart, 
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    { 
      label: 'Total Staff', 
      value: loading ? '…' : String(staffCount), 
      icon: Users, 
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    { 
      label: 'Low Stock Alerts', 
      value: loading ? '…' : String(lowStockCount), 
      icon: Package, 
      color: lowStockCount > 0 ? 'text-red-600' : 'text-gray-600',
      bg: lowStockCount > 0 ? 'bg-red-50' : 'bg-gray-50',
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2 text-lg">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-sm">
          <Activity size={16} />
          Live Data
        </div>
      </header>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} />
          {error} — Backend may not be running. Start with <code className="bg-amber-100 px-2 py-0.5 rounded text-xs">npm run dev:api</code>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-8 rounded-3xl shadow-soft hover:shadow-medium transition-all group border border-gray-50">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform ${stat.color}`}>
                  <Icon size={32} />
                </div>
              </div>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">{stat.label}</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{stat.value}</h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-soft border border-gray-50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-extrabold flex items-center gap-3 text-gray-900">
              <TrendingUp className="text-indigo-600" />
              Today&#39;s Performance
            </h2>
          </div>
          {report ? (
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Total Orders', value: report.totalOrders },
                { label: 'Total Revenue', value: `$${report.totalRevenue.toFixed(2)}` },
                { label: 'Avg. Order Value', value: `$${(report.averageOrderValue || 0).toFixed(2)}` },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">{item.label}</p>
                  <p className="text-3xl font-black text-gray-900">{item.value}</p>
                </div>
              ))}
              {report.paymentBreakdown && (
                <>
                  <div className="bg-green-50 rounded-2xl p-6 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Cash Sales</p>
                    <p className="text-3xl font-black text-green-700">${(report.paymentBreakdown.cash || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-6 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Card Sales</p>
                    <p className="text-3xl font-black text-blue-700">${(report.paymentBreakdown.card || 0).toFixed(2)}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm font-medium">Loading today&#39;s data...</p>
                </div>
              ) : (
                <p className="text-gray-400 font-medium">No sales data for today yet</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-50">
          <h2 className="text-2xl font-extrabold mb-8 flex items-center gap-3 text-gray-900">
            <BarChart3 className="text-indigo-600" />
            Top Items
          </h2>
          <div className="space-y-4">
            {topItems.length > 0 ? topItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-extrabold text-gray-900">{item.name || item.menuItem?.name || 'Item'}</p>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                    {item.totalSold || item._count?.orderItems || 0} sold
                  </p>
                </div>
                <span className="text-indigo-600 font-black">${(item.price || item.menuItem?.price || 0).toFixed(2)}</span>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <BarChart3 size={40} className="mb-3 text-gray-200" />
                <p className="text-sm font-medium">No sales data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Menu Management', href: '/menu', icon: ShoppingCart, color: 'bg-indigo-600' },
          { label: 'Staff Directory', href: '/staff', icon: Users, color: 'bg-green-600' },
          { label: 'Inventory', href: '/inventory', icon: Package, color: 'bg-orange-600' },
          { label: 'Reports', href: '#', icon: BarChart3, color: 'bg-purple-600' },
        ].map((nav, i) => {
          const Icon = nav.icon;
          return (
            <a
              key={i}
              href={nav.href}
              className={`${nav.color} text-white p-6 rounded-3xl font-bold flex flex-col items-center gap-3 hover:opacity-90 transition-opacity`}
            >
              <Icon size={32} />
              <span className="text-sm text-center">{nav.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
