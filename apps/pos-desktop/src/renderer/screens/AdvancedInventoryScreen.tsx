import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, ShoppingCart, BookOpen, Users, Plus, 
  Search, Filter, AlertTriangle, TrendingDown, 
  DollarSign, Clock, CheckCircle, Upload,
  Edit, Trash2, Eye, MoreVertical, FileText
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';

const AdvancedInventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchase-orders' | 'recipes' | 'vendors'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await inventoryService.getInventory();
      return response.data.data.items || [];
    },
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await inventoryService.getLowStock();
      return response.data.data.items || [];
    },
  });

  const items = inventoryData || [];
  const lowStockItems = lowStockData || [];

  // Mock data for purchase orders
  const purchaseOrders = [
    { id: 'PO-001', vendor: 'Fresh Foods Inc.', items: 12, total: 450.00, status: 'PENDING', date: '2024-01-18', expectedDelivery: '2024-01-20' },
    { id: 'PO-002', vendor: 'Meat Suppliers Co.', items: 8, total: 680.50, status: 'RECEIVED', date: '2024-01-17', expectedDelivery: '2024-01-19' },
    { id: 'PO-003', vendor: 'Dairy Direct', items: 15, total: 320.75, status: 'SHIPPED', date: '2024-01-16', expectedDelivery: '2024-01-21' },
  ];

  // Mock data for recipes
  const recipes = [
    { id: '1', name: 'Classic Burger', category: 'Main Course', ingredients: 8, cost: 4.50, menuPrice: 12.99, margin: 65.4 },
    { id: '2', name: 'Caesar Salad', category: 'Salads', ingredients: 6, cost: 3.20, menuPrice: 9.99, margin: 68.0 },
    { id: '3', name: 'Margherita Pizza', category: 'Pizza', ingredients: 7, cost: 3.80, menuPrice: 11.99, margin: 68.3 },
  ];

  // Mock data for vendors
  const vendors = [
    { id: '1', name: 'Fresh Foods Inc.', contact: 'John Smith', phone: '+1 234-567-8900', email: 'john@freshfoods.com', category: 'Produce', rating: 4.8, activeOrders: 2 },
    { id: '2', name: 'Meat Suppliers Co.', contact: 'Mike Johnson', phone: '+1 234-567-8901', email: 'mike@meatsuppliers.com', category: 'Meat & Poultry', rating: 4.5, activeOrders: 1 },
    { id: '3', name: 'Dairy Direct', contact: 'Sarah Davis', phone: '+1 234-567-8902', email: 'sarah@dairydirect.com', category: 'Dairy', rating: 4.9, activeOrders: 1 },
  ];

  const stats = {
    totalItems: items.length,
    lowStock: lowStockItems.length,
    outOfStock: items.filter((i: any) => i.status === 'OUT_OF_STOCK').length,
    totalValue: items.reduce((sum: number, item: any) => sum + (item.currentStock * item.costPerUnit), 0),
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      IN_STOCK: 'bg-green-100 text-green-800 border-green-300',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      OUT_OF_STOCK: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPOStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      SHIPPED: 'bg-blue-100 text-blue-800 border-blue-300',
      RECEIVED: 'bg-green-100 text-green-800 border-green-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage stock, purchase orders, recipes, and vendors</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Upload className="w-5 h-5" />
            Import
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.lowStock}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
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
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
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
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-3xl font-bold text-primary mt-1">${stats.totalValue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex">
        {[
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
          { id: 'recipes', label: 'Recipes', icon: BookOpen },
          { id: 'vendors', label: 'Vendors', icon: Users },
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

      {/* Filters - Only for Inventory tab */}
      {activeTab === 'inventory' && (
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
          >
            <option value="all">All Categories</option>
            <option value="produce">Produce</option>
            <option value="meat">Meat & Poultry</option>
            <option value="dairy">Dairy</option>
            <option value="dry-goods">Dry Goods</option>
          </select>

          <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {activeTab === 'inventory' && lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-r-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="font-bold text-orange-900">Low Stock Alert</h3>
              <p className="text-sm text-orange-700">
                {lowStockItems.length} item(s) are running low on stock
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            View Low Stock
          </motion.button>
        </motion.div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Item Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Min Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Cost/Unit</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.sku || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.category || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${
                      item.currentStock <= item.minStock ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {item.currentStock} {item.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.minStock} {item.unit}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">${item.costPerUnit.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-2 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No inventory items found</p>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {activeTab === 'purchase-orders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create PO
            </motion.button>
          </div>

          {purchaseOrders.map((po, index) => (
            <motion.div
              key={po.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{po.id}</h3>
                    <p className="text-sm text-gray-500">{po.vendor}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {po.items} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {po.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Expected: {po.expectedDelivery}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">${po.total.toFixed(2)}</p>
                  <span className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold border ${getPOStatusColor(po.status)}`}>
                    {po.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* RECIPES TAB */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe, index) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{recipe.name}</h3>
                  <p className="text-sm text-gray-500">{recipe.category}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  recipe.margin >= 65 ? 'bg-green-100 text-green-700' :
                  recipe.margin >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {recipe.margin}% margin
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ingredients:</span>
                  <span className="font-semibold">{recipe.ingredients} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Food Cost:</span>
                  <span className="font-semibold">${recipe.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Menu Price:</span>
                  <span className="font-bold text-primary">${recipe.menuPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit Recipe
                </button>
                <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* VENDORS TAB */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor, index) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                  <p className="text-sm text-gray-500">{vendor.category}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-bold text-gray-900">{vendor.rating}</span>
                  </div>
                  <p className="text-xs text-gray-500">{vendor.activeOrders} active orders</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  {vendor.contact}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📞</span>
                  {vendor.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>✉️</span>
                  {vendor.email}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  View Details
                </button>
                <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedInventoryScreen;
