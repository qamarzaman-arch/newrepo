'use client';

import React, { useEffect, useState } from 'react';
import { 
  Package, Plus, Search, 
  AlertTriangle, RefreshCcw, TrendingDown, DollarSign, Trash2
} from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  currentStock: number;
  minStock: number;
  unit: string;
  costPerUnit: number;
  status: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    currentStock: 0,
    minStock: 5,
    unit: 'Units',
    costPerUnit: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, lowRes] = await Promise.all([
        apiClient.get('/inventory'),
        apiClient.get('/inventory/low-stock'),
      ]);
      setItems(invRes.data?.data?.items || []);
      setLowStock(lowRes.data?.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/inventory', {
        ...formData,
        currentStock: Number(formData.currentStock),
        minStock: Number(formData.minStock),
        costPerUnit: Number(formData.costPerUnit),
      });
      toast.success('Inventory item added successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        sku: '',
        category: '',
        currentStock: 0,
        minStock: 5,
        unit: 'Units',
        costPerUnit: 0,
      });
      fetchInventory();
    } catch (err: any) {
      toast.error('Failed to add inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} from inventory?`)) return;
    try {
      await apiClient.delete(`/inventory/${id}`);
      toast.success('Item deleted');
      fetchInventory();
    } catch (err: any) {
      toast.error('Failed to delete item');
    }
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = items.reduce((sum, i) => sum + (i.currentStock * i.costPerUnit), 0);
  const outOfStock = items.filter(i => i.status === 'OUT_OF_STOCK').length;

  const getStatusVariant = (status: string) => {
    if (status === 'IN_STOCK') return 'success' as const;
    if (status === 'LOW_STOCK') return 'warning' as const;
    return 'error' as const;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-manrope">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Inventory Control</h1>
          <p className="text-gray-500 mt-2 font-medium">Track stock levels, manage suppliers, and monitor valuation.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={fetchInventory}>
            <RefreshCcw size={18} />
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add New Item
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <span>{error} — <button onClick={fetchInventory} className="underline">Retry</button></span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Total Items</p>
          <h3 className="text-3xl font-black text-gray-900">{items.length}</h3>
          <p className="text-xs text-gray-500 font-medium mt-2 flex items-center gap-1">
            <Package size={12} /> In database
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Total Valuation</p>
          <h3 className="text-3xl font-black text-gray-900">${totalValue.toFixed(2)}</h3>
          <p className="text-xs text-gray-500 font-medium mt-2 flex items-center gap-1">
            <DollarSign size={12} /> Stock value
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Low Stock Alerts</p>
          <h3 className="text-3xl font-black text-orange-500">{lowStock.length}</h3>
          <p className="text-xs text-orange-600 font-bold mt-2 flex items-center gap-1">
            <AlertTriangle size={12} /> {lowStock.length > 0 ? 'Requires attention' : 'All good'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Out of Stock</p>
          <h3 className="text-3xl font-black text-red-600">{outOfStock}</h3>
          <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1">
            <TrendingDown size={12} /> {outOfStock > 0 ? 'Create PO needed' : 'None out'}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-soft border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search inventory by item name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center shadow-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading inventory...</p>
        </div>
      ) : (
        <Table headers={['Item Name', 'SKU / Category', 'Current Stock', 'Min Level', 'Status', 'Cost / Unit', 'Actions']}>
          {filtered.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    <Package size={20} />
                  </div>
                  <div>
                    <div className="text-gray-900 font-bold">{item.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono uppercase">{item.id.slice(0, 8)}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-gray-900 font-medium">{item.sku || '—'}</div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{item.category || '—'}</div>
              </TableCell>
              <TableCell className={`font-bold ${item.currentStock <= item.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                {item.currentStock} {item.unit}
              </TableCell>
              <TableCell className="text-gray-500 font-medium">{item.minStock} {item.unit}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(item.status)}>
                  {item.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="font-black text-indigo-600">${item.costPerUnit.toFixed(2)}</TableCell>
              <TableCell>
                <button 
                  onClick={() => handleDeleteItem(item.id, item.name)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && !loading && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400 col-span-6">
                No inventory items found
              </TableCell>
            </TableRow>
          )}
        </Table>
      )}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Item"
      >
        <form onSubmit={handleAddItem} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Item Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="e.g. Tomato Sauce"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="INV-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="Produce"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Current Stock</label>
              <input
                required
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Min. Level (Alert)</label>
              <input
                required
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Unit (kg, pcs, etc.)</label>
              <input
                required
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="kg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Cost Per Unit</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Inventory Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
