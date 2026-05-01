'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ShoppingCart, Search, RefreshCw, Eye, CheckCircle, XCircle,
  Clock, ChefHat, Package, DollarSign, AlertTriangle, Filter,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';
import { toNum } from '@restaurant-pos/shared-types';

const STATUS_OPTIONS = ['', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY:     'bg-green-100 text-green-800',
  SERVED:    'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_NEXT: Record<string, string[]> = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY:     ['SERVED', 'COMPLETED'],
  SERVED:    ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string | null;
  tableId: string | null;
  table?: { tableNumber: string };
  createdAt: string;
  items?: { menuItem: { name: string }; quantity: number; unitPrice: number }[];
  cashier?: { fullName: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, revenue: 0 });
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await apiClient.get('/orders', { params });
      const data = res.data?.data;
      setOrders(data?.orders || []);
      const pagination = data?.pagination;
      if (pagination) setTotalPages(Math.ceil(pagination.total / 50) || 1);

      // Stats come from dedicated summary endpoint so they reflect all orders, not just this page
      const summaryRes = await apiClient.get('/orders/summary').catch(() => null);
      const summary = summaryRes?.data?.data;
      const pageOrders: Order[] = data?.orders || [];
      setStats({
        total: pagination?.total ?? pageOrders.length,
        active: summary?.activeOrders ?? pageOrders.filter((o) => ['PENDING','CONFIRMED','PREPARING','READY'].includes(o.status)).length,
        completed: summary?.completedToday ?? pageOrders.filter((o) => o.status === 'COMPLETED').length,
        revenue: summary?.revenueToday ?? pageOrders.filter((o) => o.status === 'COMPLETED').reduce((s, o) => s + Number(o.totalAmount), 0),
      });
    } catch (err: any) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await apiClient.post(`/orders/${orderId}/status`, { status: newStatus });
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter(o =>
    !searchQuery ||
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Manage and track all restaurant orders</p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          aria-label="Refresh orders list"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: stats.active, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Completed Today', value: stats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Revenue', value: `$${toNum(stats.revenue).toFixed(2)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s) => (
          // QA C25: stable key. Index would shift if the labels are ever
          // re-ordered or filtered.
          <div key={s.label} className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color} mb-3`}>
              <s.icon size={20} />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search by order number or customer…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Orders Table */}
        <div className={`${selectedOrder ? 'flex-1' : 'w-full'} bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Package size={40} className="mb-3 text-gray-200" />
              <p className="font-medium">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-700">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(order => (
                    <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${selectedOrder?.id === order.id ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-bold text-gray-900">#{order.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{order.orderType.replace('_', ' ').toLowerCase()}</td>
                      <td className="px-4 py-3 text-gray-600">{order.customerName || (order.table ? `Table ${order.table.tableNumber}` : 'Walk-in')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">${Number(order.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleTimeString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-neutral-700">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-100 rounded-lg transition-colors">
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Order Detail Panel */}
        {selectedOrder && (
          <div className="w-80 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-5 space-y-4 self-start">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900">#{selectedOrder.orderNumber}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-bold capitalize">{selectedOrder.orderType.replace('_',' ').toLowerCase()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-bold">{selectedOrder.customerName || 'Walk-in'}</span></div>
              {selectedOrder.table && <div className="flex justify-between"><span className="text-gray-500">Table</span><span className="font-bold">{selectedOrder.table.tableNumber}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-extrabold text-gray-900">${Number(selectedOrder.totalAmount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-bold">{selectedOrder.paymentMethod || '—'}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_STYLES[selectedOrder.status] || ''}`}>{selectedOrder.status}</span>
              </div>
            </div>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.quantity}× {item.menuItem?.name}</span>
                      <span className="font-bold text-gray-900">${Number(item.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {STATUS_NEXT[selectedOrder.status]?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Update Status</p>
                <div className="flex flex-col gap-2">
                  {STATUS_NEXT[selectedOrder.status].map(next => (
                    <button
                      key={next}
                      onClick={() => updateStatus(selectedOrder.id, next)}
                      disabled={updatingId === selectedOrder.id}
                      className={`py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                        next === 'CANCELLED' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {updatingId === selectedOrder.id ? '…' : `Mark ${next}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
