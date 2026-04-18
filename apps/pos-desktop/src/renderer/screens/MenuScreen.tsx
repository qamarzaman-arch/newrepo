import React, { useState } from 'react';
import { useMenuCategories, useMenuItems } from '../hooks/useMenu';
import { menuService, MenuItem } from '../services/menuService';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const MenuScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    categoryId: '',
    isActive: true,
    isAvailable: true,
    prepTimeMinutes: 15,
    taxRate: 0,
  });
  const { formatCurrency } = useCurrencyFormatter();

  const { data: categories } = useMenuCategories();
  const { data: items, refetch: refetchItems } = useMenuItems({ search: searchQuery || undefined });

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      await menuService.updateItem(itemId, { isAvailable: !currentStatus });
      toast.success('Item availability updated');
      refetchItems();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      cost: 0,
      categoryId: categories?.[0]?.id || '',
      isActive: true,
      isAvailable: true,
      prepTimeMinutes: 15,
      taxRate: 0,
    });
    setShowModal(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      cost: item.cost,
      categoryId: item.categoryId,
      isActive: item.isActive,
      isAvailable: item.isAvailable,
      prepTimeMinutes: item.prepTimeMinutes,
      taxRate: item.taxRate,
    });
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        await menuService.updateItem(editingItem.id, formData);
        toast.success('Item updated successfully');
      } else {
        await menuService.createItem(formData);
        toast.success('Item created successfully');
      }
      setShowModal(false);
      refetchItems();
    } catch (error) {
      console.error('Failed to save item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await menuService.deleteItem(itemId);
        toast.success('Item deleted successfully');
        refetchItems();
      } catch (error) {
        console.error('Failed to delete item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
        <button onClick={handleAddItem} className="px-4 py-2 gradient-btn rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <div className="bg-surface-lowest rounded-2xl p-2 shadow-soft inline-flex">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            activeTab === 'categories' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            activeTab === 'items' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Items
        </button>
      </div>

      {activeTab === 'items' && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
          />
        </div>
      )}

      {activeTab === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((category: any) => (
            <div key={category.id} className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{category.description || 'No description'}</p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                  Edit
                </button>
                <button className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items?.map((item: any) => (
            <div key={item.id} className="bg-surface-lowest rounded-2xl p-4 shadow-soft">
              <div className="text-4xl mb-3">{item.image || '🍽️'}</div>
              <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{item.category?.name}</p>
              <p className="text-lg font-bold text-primary mb-3">{formatCurrency(item.price)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                    item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </button>
                <button onClick={() => handleEditItem(item)} className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                >
                  <option value="">Select category</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.prepTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  />
                  <span className="text-sm">Available</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-1 py-3 gradient-btn rounded-xl font-semibold"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuScreen;