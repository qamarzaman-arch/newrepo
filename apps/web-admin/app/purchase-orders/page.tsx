'use client';

import React, { useState } from 'react';
import { 
  Package, Plus, Search, Truck, DollarSign, 
  Calendar, CheckCircle, Clock, XCircle, Eye
} from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';
import { toNum } from '@restaurant-pos/shared-types';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  orderedAt: string;
  expectedDelivery?: string;
  receivedAt?: string;
  items: Array<{
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const emptyItem = { description: '', quantity: 1, unitPrice: 0 };

  const [formData, setFormData] = useState({
    vendorId: '',
    items: [{ ...emptyItem }] as Array<{ description: string; quantity: number; unitPrice: number }>,
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [poRes, vendorRes] = await Promise.all([
        apiClient.get('/purchase-orders'),
        apiClient.get('/vendors'),
      ]);
      setPurchaseOrders(poRes.data?.data?.purchaseOrders || []);
      setVendors(vendorRes.data?.data?.vendors || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    for (const item of formData.items) {
      if (!item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0) {
        toast.error('Each item must have a description, quantity > 0, and unit price > 0');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/purchase-orders', formData);
      toast.success('Purchase order created!');
      setShowAddModal(false);
      setFormData({ vendorId: '', items: [{ ...emptyItem }], notes: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceivePO = async (id: string) => {
    if (!confirm('Mark this purchase order as received?')) return;
    try {
      await apiClient.post(`/purchase-orders/${id}/receive`);
      toast.success('Purchase order marked as received');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to receive purchase order');
    }
  };

  const handleCancelPO = async (id: string) => {
    if (!confirm('Cancel this purchase order?')) return;
    try {
      await apiClient.post(`/purchase-orders/${id}/cancel`);
      toast.success('Purchase order cancelled');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to cancel purchase order');
    }
  };

  const filteredOrders = purchaseOrders.filter(po =>
    po.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'neutral';
      case 'SENT': return 'warning';
      case 'RECEIVED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'neutral';
    }
  };

  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(po => po.status === 'SENT').length,
    received: purchaseOrders.filter(po => po.status === 'RECEIVED').length,
    totalValue: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Manage inventory replenishment and vendor orders
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Create Purchase Order
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-3xl shadow-soft border border-gray-100 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Orders</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-3xl shadow-soft border border-gray-100 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Pending</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.pending}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-3xl shadow-soft border border-gray-100 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Received</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.received}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-3xl shadow-soft border border-gray-100 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Value</p>
              <h3 className="text-2xl font-black text-gray-900">${toNum(stats.totalValue).toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-3xl shadow-soft border border-gray-100 dark:border-neutral-700">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by order number or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {/* Purchase Orders Table */}
      {loading ? (
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-20 text-center shadow-soft border border-gray-100 dark:border-neutral-700">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading purchase orders...</p>
        </div>
      ) : (
        <Table headers={['Order #', 'Vendor', 'Status', 'Items', 'Total', 'Date', 'Actions']}>
          {filteredOrders.map((po) => (
            <TableRow key={po.id}>
              <TableCell className="font-mono font-bold text-sm">
                {po.orderNumber}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-gray-400" />
                  <span className="font-medium">{po.vendorName}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(po.status)}>
                  {po.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {po.items.length} item{po.items.length !== 1 ? 's' : ''}
              </TableCell>
              <TableCell className="font-black text-indigo-600">
                ${toNum(po.totalAmount).toFixed(2)}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(po.orderedAt).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {po.status === 'SENT' && (
                    <button
                      onClick={() => handleReceivePO(po.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                    >
                      Receive
                    </button>
                  )}
                  {(po.status === 'DRAFT' || po.status === 'SENT') && (
                    <button
                      onClick={() => handleCancelPO(po.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                    <Eye size={18} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredOrders.length === 0 && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400">
                <Package className="mx-auto mb-2 text-gray-300" size={32} />
                No purchase orders found
              </TableCell>
            </TableRow>
          )}
        </Table>
      )}

      {/* Add Purchase Order Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Purchase Order"
      >
        <form onSubmit={handleCreatePO} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Vendor</label>
            <select
              required
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
            >
              <option value="">Select Vendor</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="Additional instructions..."
              rows={3}
            />
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">Order Items</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, items: [...formData.items, { ...emptyItem }] })}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
            {formData.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  required
                  onChange={(e) => {
                    const updated = [...formData.items];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    setFormData({ ...formData, items: updated });
                  }}
                  className="col-span-6 px-3 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={item.quantity}
                  required
                  onChange={(e) => {
                    const updated = [...formData.items];
                    updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 1 };
                    setFormData({ ...formData, items: updated });
                  }}
                  className="col-span-2 px-3 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Unit $"
                  min="0.01"
                  step="0.01"
                  value={item.unitPrice}
                  required
                  onChange={(e) => {
                    const updated = [...formData.items];
                    updated[idx] = { ...updated[idx], unitPrice: parseFloat(e.target.value) || 0 };
                    setFormData({ ...formData, items: updated });
                  }}
                  className="col-span-3 px-3 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm focus:outline-none"
                />
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.items.filter((_, i) => i !== idx);
                      setFormData({ ...formData, items: updated });
                    }}
                    className="col-span-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !formData.vendorId}
            >
              {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
