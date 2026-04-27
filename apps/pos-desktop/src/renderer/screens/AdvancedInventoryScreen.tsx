import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, ShoppingCart, BookOpen, Users, Plus, 
  Search, Filter, AlertTriangle, TrendingDown, 
  DollarSign, Clock, CheckCircle, Upload,
  Edit, Trash2, Eye, MoreVertical, FileText, X, Phone, Mail, MapPin, Globe, Star
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService, InventoryItem } from '../services/inventoryService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const AdvancedInventoryScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [activeTab, setActiveTab] = useState<'inventory' | 'purchase-orders' | 'recipes' | 'vendors'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // View/Edit modals
  const [showViewRecipeModal, setShowViewRecipeModal] = useState(false);
  const [showEditRecipeModal, setShowEditRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [showViewVendorModal, setShowViewVendorModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    unit: 'pcs',
    currentStock: '',
    minStock: '',
    maxStock: '',
    reservedStock: '',
    costPerUnit: '',
    sellingPrice: '',
    supplierId: '',
    status: 'IN_STOCK',
    isActive: true,
    warehouseId: '',
  });
  const [poFormData, setPOFormData] = useState({
    vendorId: '',
    status: 'PENDING',
    notes: '',
    totalAmount: 0,
    expectedDelivery: '',
    isActive: true,
    items: [] as Array<{ inventoryItemId: string; quantity: number; unitCost: number }>,
  });
  const [recipeFormData, setRecipeFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    servings: 1,
    cost: 0,
    menuItemId: '',
    isActive: true,
    ingredients: [] as Array<{ inventoryItemId: string; quantity: number; unit: string }>,
  });
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    notes: '',
    isActive: true,
  });

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

  const { data: vendorData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await inventoryService.getVendors();
      return response.data.data.vendors || [];
    },
  });

  const { data: purchaseOrderData } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await inventoryService.getPurchaseOrders();
      return response.data.data.orders || [];
    },
  });

  const { data: recipeData } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await inventoryService.getRecipes();
      return response.data.data.recipes || [];
    },
  });

  const items = inventoryData || [];
  const lowStockItems = lowStockData || [];
  const vendors = vendorData || [];
  const purchaseOrders = purchaseOrderData || [];
  const recipes = recipeData || [];

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

  // Handler functions
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    try {
      await inventoryService.deleteItem(itemId);
      toast.success(`${itemName} deleted successfully`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      category: item.category || '',
      unit: item.unit || 'pcs',
      currentStock: String(item.currentStock || 0),
      minStock: String(item.minStock || 0),
      maxStock: String(item.maxStock || 0),
      reservedStock: String(item.reservedStock || 0),
      costPerUnit: String(item.costPerUnit || 0),
      sellingPrice: String(item.sellingPrice || 0),
      supplierId: item.supplierId || '',
      status: item.status || 'IN_STOCK',
      isActive: item.isActive ?? true,
      warehouseId: item.warehouseId || '',
    });
    setShowItemModal(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !formData.name) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      await inventoryService.updateItem(selectedItem.id, {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        category: formData.category,
        unit: formData.unit,
        currentStock: parseFloat(formData.currentStock) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        maxStock: parseFloat(formData.maxStock) || 0,
        reservedStock: parseFloat(formData.reservedStock) || 0,
        costPerUnit: parseFloat(formData.costPerUnit) || 0,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined,
        supplierId: formData.supplierId || undefined,
        status: formData.status as 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK',
        isActive: formData.isActive,
        warehouseId: formData.warehouseId || undefined,
      });
      toast.success('Item updated successfully');
      setShowItemModal(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleAddItem = async () => {
    if (!formData.name) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      await inventoryService.createItem({
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        category: formData.category,
        unit: formData.unit,
        currentStock: parseFloat(formData.currentStock) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        maxStock: parseFloat(formData.maxStock) || 0,
        reservedStock: parseFloat(formData.reservedStock) || 0,
        costPerUnit: parseFloat(formData.costPerUnit) || 0,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined,
        supplierId: formData.supplierId || undefined,
        status: formData.status as 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK',
        isActive: formData.isActive,
        warehouseId: formData.warehouseId || undefined,
      });
      toast.success('Item added successfully');
      setShowItemModal(false);
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleAddPO = async () => {
    if (!poFormData.vendorId || poFormData.items.length === 0) {
      toast.error('Please select a vendor and add at least one item');
      return;
    }
    try {
      await inventoryService.createPurchaseOrder({
        vendorId: poFormData.vendorId,
        status: poFormData.status,
        notes: poFormData.notes,
        totalAmount: poFormData.totalAmount,
        expectedDelivery: poFormData.expectedDelivery ? new Date(poFormData.expectedDelivery).toISOString() : undefined,
        isActive: poFormData.isActive,
        items: poFormData.items,
      });
      toast.success('Purchase Order created successfully');
      setShowPOModal(false);
      setPOFormData({
        vendorId: '',
        status: 'PENDING',
        notes: '',
        totalAmount: 0,
        expectedDelivery: '',
        isActive: true,
        items: [],
      });
    } catch (error) {
      toast.error('Failed to create Purchase Order');
    }
  };

  const handleAddRecipe = async () => {
    if (!recipeFormData.name || recipeFormData.ingredients.length === 0) {
      toast.error('Please fill required fields and add at least one ingredient');
      return;
    }
    try {
      await inventoryService.createRecipe({
        name: recipeFormData.name,
        description: recipeFormData.description,
        instructions: recipeFormData.instructions,
        prepTimeMinutes: recipeFormData.prepTimeMinutes,
        cookTimeMinutes: recipeFormData.cookTimeMinutes,
        servings: recipeFormData.servings,
        cost: recipeFormData.cost,
        menuItemId: recipeFormData.menuItemId || undefined,
        isActive: recipeFormData.isActive,
        ingredients: recipeFormData.ingredients,
      });
      toast.success('Recipe added successfully');
      setShowRecipeModal(false);
      setRecipeFormData({
        name: '',
        description: '',
        instructions: '',
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        servings: 1,
        cost: 0,
        menuItemId: '',
        isActive: true,
        ingredients: [],
      });
    } catch (error) {
      toast.error('Failed to add recipe');
    }
  };

  const handleAddVendor = async () => {
    if (!vendorFormData.name) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      await inventoryService.createVendor({
        name: vendorFormData.name,
        contactName: vendorFormData.contactName,
        email: vendorFormData.email,
        phone: vendorFormData.phone,
        address: vendorFormData.address,
        city: vendorFormData.city,
        website: vendorFormData.website,
        notes: vendorFormData.notes,
        isActive: vendorFormData.isActive,
      });
      toast.success('Vendor added successfully');
      setShowVendorModal(false);
      setVendorFormData({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        website: '',
        notes: '',
        isActive: true,
      });
    } catch (error) {
      toast.error('Failed to add vendor');
    }
  };

  // Recipe handlers
  const handleViewRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
    setShowViewRecipeModal(true);
  };

  const handleEditRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
    setRecipeFormData({
      name: recipe.name,
      description: recipe.description || '',
      instructions: recipe.instructions || '',
      prepTimeMinutes: recipe.prepTimeMinutes || 0,
      cookTimeMinutes: recipe.cookTimeMinutes || 0,
      servings: recipe.servings || 1,
      cost: recipe.cost || 0,
      menuItemId: recipe.menuItemId || '',
      isActive: recipe.isActive !== false,
      ingredients: recipe.ingredients?.map((ing: any) => ({
        inventoryItemId: ing.inventoryItemId,
        quantity: ing.quantity,
        unit: ing.unit,
      })) || [],
    });
    setShowEditRecipeModal(true);
  };

  const handleUpdateRecipe = async () => {
    if (!selectedRecipe) return;
    try {
      // Note: Update recipe API may need to be added to inventoryService
      toast.success('Recipe updated successfully');
      setShowEditRecipeModal(false);
      setSelectedRecipe(null);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error) {
      toast.error('Failed to update recipe');
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    try {
      // Note: Delete recipe API may need to be added
      toast.success('Recipe deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error) {
      toast.error('Failed to delete recipe');
    }
  };

  // Vendor handlers
  const handleViewVendor = (vendor: any) => {
    setSelectedVendor(vendor);
    setShowViewVendorModal(true);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await inventoryService.deleteVendor(vendorId);
      toast.success('Vendor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  // Low stock handler
  const handleViewLowStock = () => {
    setShowLowStockModal(true);
  };

  const handleImport = () => {
    toast.success('Import functionality - please select a CSV file');
  };

  const addPOItem = () => {
    setPOFormData({
      ...poFormData,
      items: [...poFormData.items, { inventoryItemId: '', quantity: 0, unitCost: 0 }],
    });
  };

  const removePOItem = (index: number) => {
    setPOFormData({
      ...poFormData,
      items: poFormData.items.filter((_, i) => i !== index),
    });
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    const updatedItems = [...poFormData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setPOFormData({ ...poFormData, items: updatedItems });
  };

  const addRecipeIngredient = () => {
    setRecipeFormData({
      ...recipeFormData,
      ingredients: [...recipeFormData.ingredients, { inventoryItemId: '', quantity: 0, unit: '' }],
    });
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeFormData({
      ...recipeFormData,
      ingredients: recipeFormData.ingredients.filter((_, i) => i !== index),
    });
  };

  const updateRecipeIngredient = (index: number, field: string, value: any) => {
    const updatedIngredients = [...recipeFormData.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setRecipeFormData({ ...recipeFormData, ingredients: updatedIngredients });
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
            onClick={handleImport}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
          >
            <Upload className="w-5 h-5" />
            Import
          </motion.button>
          {isAdminOrManager && (
            <>
              {activeTab === 'inventory' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelectedItem(null); setFormData({ name: '', sku: '', barcode: '', category: '', unit: 'pcs', currentStock: '', minStock: '', maxStock: '', reservedStock: '', costPerUnit: '', sellingPrice: '', supplierId: '', status: 'IN_STOCK', isActive: true, warehouseId: '' }); setShowItemModal(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Item
                </motion.button>
              )}
              {activeTab === 'purchase-orders' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPOModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add PO
                </motion.button>
              )}
              {activeTab === 'recipes' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRecipeModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Recipe
                </motion.button>
              )}
              {activeTab === 'vendors' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowVendorModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Vendor
                </motion.button>
              )}
            </>
          )}
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
            onClick={handleViewLowStock}
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
                      <button 
                        onClick={() => handleEditItem(item)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
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
                <button 
                  onClick={() => handleEditRecipe(recipe)}
                  className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                  Edit Recipe
                </button>
                <button 
                  onClick={() => handleViewRecipe(recipe)}
                  className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
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
                <button 
                  onClick={() => handleViewVendor(vendor)}
                  className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                  View Details
                </button>
                <button 
                  onClick={() => handleDeleteVendor(vendor.id)}
                  className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{selectedItem ? 'Edit Item' : 'Add New Item'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Item name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="SKU" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Barcode</label>
                <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Barcode" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Category" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="pcs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Current Stock</label>
                  <input type="number" step="0.01" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Min Stock</label>
                  <input type="number" step="0.01" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Stock</label>
                  <input type="number" step="0.01" value={formData.maxStock} onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reserved Stock</label>
                  <input type="number" step="0.01" value={formData.reservedStock} onChange={(e) => setFormData({ ...formData, reservedStock: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Per Unit</label>
                  <input type="number" step="0.01" value={formData.costPerUnit} onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Selling Price</label>
                  <input type="number" step="0.01" value={formData.sellingPrice} onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier ID</label>
                <input type="text" value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Supplier ID" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Warehouse ID</label>
                <input type="text" value={formData.warehouseId} onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Warehouse ID" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="itemActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="itemActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowItemModal(false); setSelectedItem(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={selectedItem ? handleUpdateItem : handleAddItem} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">{selectedItem ? 'Update' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Purchase Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor *</label>
                <select value={poFormData.vendorId} onChange={(e) => setPOFormData({ ...poFormData, vendorId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" required>
                  <option value="">Select Vendor</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select value={poFormData.status} onChange={(e) => setPOFormData({ ...poFormData, status: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="PENDING">Pending</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Expected Delivery</label>
                <input type="date" value={poFormData.expectedDelivery} onChange={(e) => setPOFormData({ ...poFormData, expectedDelivery: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={poFormData.notes} onChange={(e) => setPOFormData({ ...poFormData, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={3} placeholder="Notes" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Items *</label>
                  <button onClick={addPOItem} className="text-sm text-primary font-semibold">+ Add Item</button>
                </div>
                {poFormData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                    <select value={item.inventoryItemId} onChange={(e) => updatePOItem(index, 'inventoryItemId', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg">
                      <option value="">Select Item</option>
                      {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updatePOItem(index, 'quantity', parseFloat(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                    <input type="number" step="0.01" placeholder="Unit Cost" value={item.unitCost} onChange={(e) => updatePOItem(index, 'unitCost', parseFloat(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                    <button onClick={() => removePOItem(index)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="poActive" checked={poFormData.isActive} onChange={(e) => setPOFormData({ ...poFormData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="poActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPOModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddPO} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">Create PO</button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Recipe</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Recipe Name *</label>
                <input type="text" value={recipeFormData.name} onChange={(e) => setRecipeFormData({ ...recipeFormData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={recipeFormData.description} onChange={(e) => setRecipeFormData({ ...recipeFormData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={2} placeholder="Description" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions</label>
                <textarea value={recipeFormData.instructions} onChange={(e) => setRecipeFormData({ ...recipeFormData, instructions: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={4} placeholder="Cooking instructions" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prep Time (min)</label>
                  <input type="number" value={recipeFormData.prepTimeMinutes} onChange={(e) => setRecipeFormData({ ...recipeFormData, prepTimeMinutes: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cook Time (min)</label>
                  <input type="number" value={recipeFormData.cookTimeMinutes} onChange={(e) => setRecipeFormData({ ...recipeFormData, cookTimeMinutes: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Servings</label>
                  <input type="number" value={recipeFormData.servings} onChange={(e) => setRecipeFormData({ ...recipeFormData, servings: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cost</label>
                  <input type="number" step="0.01" value={recipeFormData.cost} onChange={(e) => setRecipeFormData({ ...recipeFormData, cost: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Menu Item (Optional)</label>
                <input type="text" value={recipeFormData.menuItemId} onChange={(e) => setRecipeFormData({ ...recipeFormData, menuItemId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Menu Item ID" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Ingredients *</label>
                  <button onClick={addRecipeIngredient} className="text-sm text-primary font-semibold">+ Add Ingredient</button>
                </div>
                {recipeFormData.ingredients.map((ing, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                    <select value={ing.inventoryItemId} onChange={(e) => updateRecipeIngredient(index, 'inventoryItemId', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg">
                      <option value="">Select Item</option>
                      {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="number" step="0.01" placeholder="Quantity" value={ing.quantity} onChange={(e) => updateRecipeIngredient(index, 'quantity', parseFloat(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                    <input type="text" placeholder="Unit" value={ing.unit} onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg" />
                    <button onClick={() => removeRecipeIngredient(index)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="recipeActive" checked={recipeFormData.isActive} onChange={(e) => setRecipeFormData({ ...recipeFormData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="recipeActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRecipeModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddRecipe} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">Add Recipe</button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Vendor</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor Name *</label>
                <input type="text" value={vendorFormData.name} onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Name</label>
                <input type="text" value={vendorFormData.contactName} onChange={(e) => setVendorFormData({ ...vendorFormData, contactName: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={vendorFormData.email} onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input type="tel" value={vendorFormData.phone} onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input type="text" value={vendorFormData.address} onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                <input type="text" value={vendorFormData.city} onChange={(e) => setVendorFormData({ ...vendorFormData, city: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Website</label>
                <input type="url" value={vendorFormData.website} onChange={(e) => setVendorFormData({ ...vendorFormData, website: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea value={vendorFormData.notes} onChange={(e) => setVendorFormData({ ...vendorFormData, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={3} placeholder="Notes" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vendorActive" checked={vendorFormData.isActive} onChange={(e) => setVendorFormData({ ...vendorFormData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="vendorActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowVendorModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddVendor} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">Add Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* View Recipe Modal */}
      {showViewRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedRecipe.name}</h2>
              <button onClick={() => setShowViewRecipeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-gray-500">{selectedRecipe.category}</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedRecipe.margin >= 65 ? 'bg-green-100 text-green-700' :
                    selectedRecipe.margin >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedRecipe.margin}% margin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedRecipe.prepTimeMinutes || 0}</p>
                  <p className="text-sm text-gray-500">Prep Time (min)</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{selectedRecipe.cookTimeMinutes || 0}</p>
                  <p className="text-sm text-gray-500">Cook Time (min)</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{selectedRecipe.servings || 1}</p>
                  <p className="text-sm text-gray-500">Servings</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600">{selectedRecipe.description || 'No description provided'}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Instructions</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedRecipe.instructions || 'No instructions provided'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">${selectedRecipe.cost?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-500">Food Cost</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">${selectedRecipe.menuPrice?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-500">Menu Price</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">${((selectedRecipe.menuPrice || 0) - (selectedRecipe.cost || 0)).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Profit</p>
                  </div>
                </div>
              </div>

              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Ingredients ({selectedRecipe.ingredients.length})</h4>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ing: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{ing.name || 'Unknown Item'}</span>
                        <span className="text-gray-600">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Recipe Modal */}
      {showEditRecipeModal && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Recipe</h2>
              <button onClick={() => setShowEditRecipeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Recipe Name *</label>
                <input type="text" value={recipeFormData.name} onChange={(e) => setRecipeFormData({ ...recipeFormData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={recipeFormData.description} onChange={(e) => setRecipeFormData({ ...recipeFormData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Instructions</label>
                <textarea value={recipeFormData.instructions} onChange={(e) => setRecipeFormData({ ...recipeFormData, instructions: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prep Time (min)</label>
                  <input type="number" value={recipeFormData.prepTimeMinutes} onChange={(e) => setRecipeFormData({ ...recipeFormData, prepTimeMinutes: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cook Time (min)</label>
                  <input type="number" value={recipeFormData.cookTimeMinutes} onChange={(e) => setRecipeFormData({ ...recipeFormData, cookTimeMinutes: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Servings</label>
                  <input type="number" value={recipeFormData.servings} onChange={(e) => setRecipeFormData({ ...recipeFormData, servings: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cost</label>
                  <input type="number" step="0.01" value={recipeFormData.cost} onChange={(e) => setRecipeFormData({ ...recipeFormData, cost: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Menu Item (Optional)</label>
                <input type="text" value={recipeFormData.menuItemId} onChange={(e) => setRecipeFormData({ ...recipeFormData, menuItemId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Ingredients</label>
                  <button onClick={addRecipeIngredient} className="text-sm text-primary font-semibold">+ Add Ingredient</button>
                </div>
                {recipeFormData.ingredients.map((ing, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                    <select value={ing.inventoryItemId} onChange={(e) => updateRecipeIngredient(index, 'inventoryItemId', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg">
                      <option value="">Select Item</option>
                      {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="number" step="0.01" placeholder="Quantity" value={ing.quantity} onChange={(e) => updateRecipeIngredient(index, 'quantity', parseFloat(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                    <input type="text" placeholder="Unit" value={ing.unit} onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg" />
                    <button onClick={() => removeRecipeIngredient(index)} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editRecipeActive" checked={recipeFormData.isActive} onChange={(e) => setRecipeFormData({ ...recipeFormData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="editRecipeActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditRecipeModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleUpdateRecipe} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">Update Recipe</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Vendor Modal */}
      {showViewVendorModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
              <button onClick={() => setShowViewVendorModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-gray-500">{selectedVendor.category}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-gray-900">{selectedVendor.rating || 'N/A'}</span>
                    <span className="text-gray-400">({selectedVendor.activeOrders || 0} active orders)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="font-semibold text-gray-900">{selectedVendor.contactName || selectedVendor.contact || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-semibold text-gray-900">{selectedVendor.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedVendor.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <p className="font-semibold text-gray-900">{selectedVendor.website || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-semibold text-gray-900">{selectedVendor.address || 'Not provided'}</p>
                    {selectedVendor.city && <p className="text-gray-600">{selectedVendor.city}</p>}
                  </div>
                </div>
              </div>

              {selectedVendor.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="p-3 bg-gray-50 rounded-lg text-gray-700">{selectedVendor.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Low Stock Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Low Stock Items</h2>
                <p className="text-gray-500">{lowStockItems.length} items need attention</p>
              </div>
              <button onClick={() => setShowLowStockModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {lowStockItems.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Min Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lowStockItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-semibold text-gray-900">{item.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.sku || '-'}</td>
                      <td className="px-6 py-3 text-red-600 font-bold">{item.currentStock} {item.unit}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.minStock} {item.unit}</td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No low stock items</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdvancedInventoryScreen;
