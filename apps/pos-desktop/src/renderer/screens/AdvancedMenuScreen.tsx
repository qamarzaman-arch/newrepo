import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Trash2, Search, Filter, Download, Upload, Edit,
  Package, Tag, Star, Eye, EyeOff, BarChart3
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../hooks/useMenu';
import { menuService } from '../services/menuService';
import toast from 'react-hot-toast';

const AdvancedMenuScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'modifiers' | 'combos'>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    categoryId: '',
    description: '',
    isAvailable: true,
  });

  const { data: categories } = useMenuCategories();
  const { data: items } = useMenuItems({ 
    search: searchQuery || undefined,
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined
  });

  // Combos and Modifiers would connect to the advanced DB schema
  // We initialize them to empty functional UI states until backend implementation.
  const modifiers: any[] = [];
  const combos: any[] = [];

  const stats = {
    totalItems: items?.length || 0,
    available: items?.filter((i: any) => i.isAvailable).length || 0,
    unavailable: items?.filter((i: any) => !i.isAvailable).length || 0,
    categories: categories?.length || 0,
  };

  // Handler functions
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    try {
      await menuService.deleteItem(itemId);
      toast.success(`${itemName} deleted successfully`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleAddItem = async () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await menuService.createItem({
        name: formData.name,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        description: formData.description,
        isAvailable: formData.isAvailable,
      });
      toast.success(`${formData.name} created successfully`);
      setShowAddModal(false);
      setFormData({ name: '', price: '', categoryId: '', description: '', isAvailable: true });
      window.location.reload();
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error('Failed to create item');
    }
  };

  const handleEditItemClick = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: String(item.price),
      categoryId: item.categoryId || item.category?.id || '',
      description: item.description || '',
      isAvailable: item.isAvailable,
    });
    setShowAddModal(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await menuService.updateItem(editingItem.id, {
        name: formData.name,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        description: formData.description,
        isAvailable: formData.isAvailable,
      });
      toast.success(`${formData.name} updated successfully`);
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({ name: '', price: '', categoryId: '', description: '', isAvailable: true });
      window.location.reload();
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const importedItems = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const item: any = {};
            headers.forEach((header, index) => {
              let value = values[index]?.trim().replace(/^"|"$/g, '') || '';
              item[header] = value;
            });
            
            if (item.name && item.price) {
              importedItems.push({
                name: item.name,
                price: parseFloat(item.price) || 0,
                categoryId: formData.categoryId || undefined,
                description: item.description || '',
                isAvailable: item.available !== 'false',
              });
            }
          }

          if (importedItems.length === 0) {
            toast.error('No valid items found in CSV');
            return;
          }

          toast.loading(`Importing ${importedItems.length} items...`, { id: 'import' });
          
          for (const item of importedItems) {
            await menuService.createItem(item);
          }
          
          toast.success(`Imported ${importedItems.length} items successfully!`, { id: 'import' });
          window.location.reload();
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Failed to import items');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExport = () => {
    // Export current menu items as CSV
    if (!items || items.length === 0) {
      toast.error('No items to export');
      return;
    }

    const csvContent = [
      ['ID', 'Name', 'Price', 'Category', 'Available'].join(','),
      ...items.map((item: any) => [
        item.id,
        `"${item.name}"`,
        item.price,
        item.category?.name || '',
        item.isAvailable
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Menu items exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Menu Management</h1>
          <p className="text-gray-600 mt-1">Manage items, categories, modifiers, and combo meals</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImport}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Upload className="w-5 h-5" />
            Import
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Download className="w-5 h-5" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingItem(null); setFormData({ name: '', price: '', categoryId: '', description: '', isAvailable: true }); setShowAddModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalItems}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.available}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unavailable</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.unavailable}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.categories}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex">
        {[
          { id: 'items', label: 'Menu Items', icon: Package },
          { id: 'categories', label: 'Categories', icon: Tag },
          { id: 'modifiers', label: 'Modifiers', icon: Star },
          { id: 'combos', label: 'Combo Meals', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
        >
          <option value="all">All Categories</option>
          {categories?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
          <Filter className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-3 ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-600'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-3 ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'items' && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
          {items?.map((item: any, index: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${
                viewMode === 'list' ? 'p-4 flex items-center gap-4' : 'p-4'
              }`}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="aspect-square rounded-xl bg-gray-100 mb-3 flex items-center justify-center text-4xl">
                    {item.image || '🍽️'}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{item.category?.name}</p>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.isAvailable ? 'Available' : 'Hidden'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditItemClick(item)}
                      className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {item.image || '🍽️'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.category?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
                    <span className={`text-xs font-semibold ${
                      item.isAvailable ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {item.isAvailable ? '● Available' : '○ Hidden'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditItem(item.id)}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((category: any, index: number) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                  <Tag className="w-8 h-8 text-primary" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  category.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{category.description || 'No description'}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>Display Order: #{category.displayOrder}</span>
                <span>{/* Would show item count */}0 items</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit
                </button>
                <button className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'modifiers' && (
        <div className="space-y-4">
          {modifiers.map((modifier, index) => (
            <motion.div
              key={modifier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{modifier.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{modifier.type.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    modifier.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {modifier.required ? 'Required' : 'Optional'}
                  </span>
                  <span className="text-sm text-gray-600">{modifier.options} options</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit Options
                </button>
                <button className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
                  Duplicate
                </button>
                <button className="ml-auto p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'combos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combos.map((combo, index) => (
            <motion.div
              key={combo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{combo.name}</h3>
                  <p className="text-sm text-gray-500">{combo.items} items included</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">${combo.price.toFixed(2)}</p>
                  <p className="text-xs text-green-600 font-semibold">Save ${combo.savings.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit Combo
                </button>
                <button className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
)}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Item name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Price *</label>
                <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="">Select category</option>
                  {categories?.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={3} placeholder="Item description" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAvailable" checked={formData.isAvailable} onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="isAvailable" className="text-sm text-gray-700">Available for ordering</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={editingItem ? handleUpdateItem : handleAddItem} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">{editingItem ? 'Update' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedMenuScreen;
