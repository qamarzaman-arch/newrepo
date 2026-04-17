import React, { useState } from 'react';
import { useMenuCategories, useMenuItems } from '../hooks/useMenu';
import { menuService } from '../services/menuService';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const MenuScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('items');
  const [searchQuery, setSearchQuery] = useState('');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
        <button className="px-4 py-2 gradient-btn rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Tabs */}
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

      {/* Search */}
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

      {/* Content */}
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
                <button className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuScreen;
