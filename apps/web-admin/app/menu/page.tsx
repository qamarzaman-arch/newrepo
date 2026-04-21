'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Filter, Edit2, Trash2, Utensils
} from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/currency';

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category?: MenuCategory;
}

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    price: 0,
    categoryId: '',
    description: '',
    isAvailable: true,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, itemsRes] = await Promise.all([
        apiClient.get('/menu/categories'),
        apiClient.get('/menu/items'),
      ]);
      setCategories(catRes.data?.data?.categories || []);
      setMenuItems(itemsRes.data?.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await apiClient.delete(`/menu/items/${itemId}`);
      toast.success('Item deleted');
      setMenuItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err: any) {
      toast.error('Failed to delete item');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/menu/items', {
        ...itemForm,
        price: Number(itemForm.price),
      });
      toast.success('Menu item added!');
      setShowItemModal(false);
      setItemForm({ name: '', price: 0, categoryId: '', description: '', isAvailable: true });
      fetchData();
    } catch (err: any) {
      toast.error('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/menu/categories', {
        ...categoryForm,
        displayOrder: Number(categoryForm.displayOrder),
      });
      toast.success('Category added!');
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '', displayOrder: 0, isActive: true });
      fetchData();
    } catch (err: any) {
      toast.error('Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Menu Management</h1>
          <p className="text-gray-500 mt-2 font-medium">
            {menuItems.length} items across {categories.length} categories
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={fetchData}>
            <Filter size={18} />
            Refresh
          </Button>
          <Button 
            className="gap-2" 
            onClick={() => activeTab === 'items' ? setShowItemModal(true) : setShowCategoryModal(true)}
          >
            <Plus size={18} />
            {activeTab === 'items' ? 'Add Menu Item' : 'Add Category'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 rounded-3xl shadow-soft border border-gray-100">
        <div className="flex p-2 bg-gray-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('items')}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'items' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu Items ({menuItems.length})
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Categories ({categories.length})
          </button>
        </div>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center shadow-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading menu data...</p>
        </div>
      ) : activeTab === 'items' ? (
        <Table headers={['Item Details', 'Category', 'Price', 'Status', 'Actions']}>
          {filteredItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-bold">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    <Utensils size={20} />
                  </div>
                  <div>
                    <p className="text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono italic">{item.id.slice(0, 8)}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-gray-600 font-medium">{item.category?.name || '—'}</TableCell>
              <TableCell className="font-black text-indigo-600">{formatCurrency(item.price)}</TableCell>
              <TableCell>
                <Badge variant={item.isAvailable ? 'success' : 'error'}>
                  {item.isAvailable ? 'Available' : 'Hidden'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button className="p-2.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all">
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredItems.length === 0 && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400">
                No menu items found
              </TableCell>
            </TableRow>
          )}
        </Table>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="bg-white p-8 rounded-3xl shadow-soft border border-gray-50 hover:shadow-medium hover:-translate-y-1 transition-all group flex items-start justify-between">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Utensils size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">{cat.name}</h3>
                  <p className="text-gray-400 text-xs mt-1">{cat.description || 'No description'}</p>
                  <div className="mt-3">
                    <Badge variant={cat.isActive ? 'success' : 'error'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <p className="col-span-3 text-center py-12 text-gray-400">No categories found</p>
          )}
        </div>
      )}
      {/* Add Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Add New Menu Item"
      >
        <form onSubmit={handleAddItem} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Item Name</label>
            <input
              required
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="e.g. Classic Burger"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Price ($)</label>
              <input
                required
                type="number"
                step="0.01"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Category</label>
              <select
                required
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={() => setShowItemModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Add Menu Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Category Name</label>
            <input
              required
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="e.g. Desserts"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="Flavorful sweet treats..."
            />
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={() => setShowCategoryModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
