import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Trash2, Search, Filter, Download, Upload, Edit,
  Package, Tag, Star, Eye, EyeOff, BarChart3, Image, X
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMenuCategories, useMenuItems } from '../hooks/useMenu';
import { menuService } from '../services/menuService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

const AdvancedMenuScreen: React.FC = () => {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();

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
    image: '',
    allergens: '',
    prepTime: '',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
    image: '',
  });
  
  // Modifier modal state
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [editingModifier, setEditingModifier] = useState<any>(null);
  const [modifierFormData, setModifierFormData] = useState({
    menuItemId: '',
    name: '',
    type: 'single',
    isRequired: false,
    displayOrder: 0,
    options: [] as any[],
  });
  
  // Combo modal state
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any>(null);
  const [comboFormData, setComboFormData] = useState({
    name: '',
    description: '',
    price: 0,
    isAvailable: true,
    startDate: '',
    endDate: '',
    isActive: true,
    items: [] as any[],
  });

  const { data: categories } = useMenuCategories();
  const { data: items } = useMenuItems({ 
    search: searchQuery || undefined,
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined
  });

  const { data: modifierData } = useQuery({
    queryKey: ['menu-modifiers'],
    queryFn: async () => {
      const response = await menuService.getModifiers();
      return response.data.data.modifiers || [];
    },
  });

  const { data: comboData } = useQuery({
    queryKey: ['menu-combos'],
    queryFn: async () => {
      const response = await menuService.getCombos();
      return response.data.data.combos || [];
    },
  });

  const modifiers = modifierData || [];
  const combos = comboData || [];

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
        image: formData.image,
      });
      toast.success(`${formData.name} created successfully`);
      setShowAddModal(false);
      setFormData({ name: '', price: '', categoryId: '', description: '', isAvailable: true, image: '', allergens: '', prepTime: '' });
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
      image: item.image || '',
      allergens: item.allergens || '',
      prepTime: String(item.prepTimeMinutes || ''),
    });
    setPreviewImage(item.image || null);
    setShowAddModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      setFormData({ ...formData, image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreviewImage(null);
    setFormData({ ...formData, image: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      setFormData({ name: '', price: '', categoryId: '', description: '', isAvailable: true, image: '', allergens: '', prepTime: '' });
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
          
          const importedItems: Array<{
            name: string;
            price: number;
            categoryId?: string;
            description: string;
            isAvailable: boolean;
          }> = [];
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

  const handleRefresh = async () => {
    try {
      if (activeTab === 'items') {
        queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      } else if (activeTab === 'categories') {
        queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      } else if (activeTab === 'modifiers') {
        queryClient.invalidateQueries({ queryKey: ['menu-modifiers'] });
      } else if (activeTab === 'combos') {
        queryClient.invalidateQueries({ queryKey: ['menu-combos'] });
      }
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('Failed to refresh data');
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true,
      image: '',
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive,
      image: category.image || '',
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await menuService.updateCategory(editingCategory.id, categoryFormData);
        toast.success('Category updated successfully');
      } else {
        await menuService.createCategory(categoryFormData);
        toast.success('Category created successfully');
      }
      setShowCategoryModal(false);
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await menuService.deleteCategory(categoryId);
        toast.success('Category deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      } catch (error) {
        console.error('Failed to delete category:', error);
        toast.error('Failed to delete category');
      }
    }
  };

  // Modifier handlers
  const handleAddModifier = () => {
    setEditingModifier(null);
    setModifierFormData({
      menuItemId: '',
      name: '',
      type: 'single',
      isRequired: false,
      displayOrder: 0,
      options: [{ name: '', priceAdjustment: 0, isDefault: true, displayOrder: 0 }],
    });
    setShowModifierModal(true);
  };

  const handleEditModifier = (modifier: any) => {
    setEditingModifier(modifier);
    setModifierFormData({
      menuItemId: modifier.menuItemId,
      name: modifier.name,
      type: modifier.type,
      isRequired: modifier.isRequired,
      displayOrder: modifier.displayOrder || 0,
      options: modifier.options?.length > 0 ? modifier.options : [{ name: '', priceAdjustment: 0, isDefault: true, displayOrder: 0 }],
    });
    setShowModifierModal(true);
  };

  const addModifierOption = () => {
    setModifierFormData({
      ...modifierFormData,
      options: [...modifierFormData.options, { name: '', priceAdjustment: 0, isDefault: false, displayOrder: modifierFormData.options.length }],
    });
  };

  const removeModifierOption = (index: number) => {
    if (modifierFormData.options.length > 1) {
      setModifierFormData({
        ...modifierFormData,
        options: modifierFormData.options.filter((_, i) => i !== index),
      });
    } else {
      toast.error('At least one option is required');
    }
  };

  const updateModifierOption = (index: number, field: string, value: any) => {
    const updatedOptions = [...modifierFormData.options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setModifierFormData({ ...modifierFormData, options: updatedOptions });
  };

  const handleSaveModifier = async () => {
    if (modifierFormData.options.length === 0) {
      toast.error('At least one option is required');
      return;
    }
    try {
      if (editingModifier) {
        await menuService.updateModifier(editingModifier.id, modifierFormData);
        toast.success('Modifier updated successfully');
      } else {
        await menuService.createModifier(modifierFormData);
        toast.success('Modifier created successfully');
      }
      setShowModifierModal(false);
      queryClient.invalidateQueries({ queryKey: ['menu-modifiers'] });
    } catch (error) {
      console.error('Failed to save modifier:', error);
      toast.error('Failed to save modifier');
    }
  };

  const handleDeleteModifier = async (modifierId: string) => {
    if (confirm('Are you sure you want to delete this modifier?')) {
      try {
        await menuService.deleteModifier(modifierId);
        toast.success('Modifier deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['menu-modifiers'] });
      } catch (error) {
        console.error('Failed to delete modifier:', error);
        toast.error('Failed to delete modifier');
      }
    }
  };

  // Combo handlers
  const handleAddCombo = () => {
    setEditingCombo(null);
    setComboFormData({
      name: '',
      description: '',
      price: 0,
      isAvailable: true,
      startDate: '',
      endDate: '',
      isActive: true,
      items: [{ menuItemId: '', quantity: 1, price: 0 }],
    });
    setShowComboModal(true);
  };

  const handleEditCombo = (combo: any) => {
    setEditingCombo(combo);
    setComboFormData({
      name: combo.name,
      description: combo.description || '',
      price: combo.price,
      isAvailable: combo.isAvailable,
      startDate: combo.startDate || '',
      endDate: combo.endDate || '',
      isActive: combo.isActive,
      items: combo.items?.length > 0 ? combo.items : [{ menuItemId: '', quantity: 1, price: 0 }],
    });
    setShowComboModal(true);
  };

  const addComboItem = () => {
    setComboFormData({
      ...comboFormData,
      items: [...comboFormData.items, { menuItemId: '', quantity: 1, price: 0 }],
    });
  };

  const removeComboItem = (index: number) => {
    if (comboFormData.items.length > 1) {
      setComboFormData({
        ...comboFormData,
        items: comboFormData.items.filter((_, i) => i !== index),
      });
    } else {
      toast.error('At least one item is required');
    }
  };

  const updateComboItem = (index: number, field: string, value: any) => {
    const updatedItems = [...comboFormData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setComboFormData({ ...comboFormData, items: updatedItems });
  };

  const handleSaveCombo = async () => {
    if (comboFormData.items.length === 0) {
      toast.error('At least one item is required');
      return;
    }
    try {
      if (editingCombo) {
        await menuService.updateCombo(editingCombo.id, comboFormData);
        toast.success('Combo updated successfully');
      } else {
        await menuService.createCombo(comboFormData);
        toast.success('Combo created successfully');
      }
      setShowComboModal(false);
      queryClient.invalidateQueries({ queryKey: ['menu-combos'] });
    } catch (error) {
      console.error('Failed to save combo:', error);
      toast.error('Failed to save combo');
    }
  };

  const handleDeleteCombo = async (comboId: string) => {
    if (confirm('Are you sure you want to delete this combo?')) {
      try {
        await menuService.deleteCombo(comboId);
        toast.success('Combo deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['menu-combos'] });
      } catch (error) {
        console.error('Failed to delete combo:', error);
        toast.error('Failed to delete combo');
      }
    }
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
            onClick={handleRefresh}
            className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
          {isAdminOrManager && (
            <>
              {activeTab === 'items' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingItem(null); setFormData({ name: '', price: '', categoryId: '', description: '', isAvailable: true, image: '', allergens: '', prepTime: '' }); setPreviewImage(null); setShowAddModal(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Item
                </motion.button>
              )}
              {activeTab === 'categories' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Category
                </motion.button>
              )}
              {activeTab === 'modifiers' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddModifier}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Modifier
                </motion.button>
              )}
              {activeTab === 'combos' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddCombo}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Add Combo
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
                      onClick={() => handleEditItemClick(item)}
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
                <button onClick={() => handleEditCategory(category)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDeleteCategory(category.id)} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'modifiers' && (
        <div className="space-y-4">
          {modifiers.map((modifier: any, index: number) => (
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
                <button onClick={() => handleEditModifier(modifier)} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit Options
                </button>
                <button className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
                  Duplicate
                </button>
                <button onClick={() => handleDeleteModifier(modifier.id)} className="ml-auto p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'combos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combos.map((combo: any, index: number) => (
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
                <button onClick={() => handleEditCombo(combo)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDeleteCombo(combo.id)} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
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
              
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Item Image</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {previewImage ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={clearImage}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Image className="w-8 h-8" />
                    <span className="text-xs">Upload Image</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={editingItem ? handleUpdateItem : handleAddItem} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">{editingItem ? 'Update' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input type="text" value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Category name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={categoryFormData.description} onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={3} placeholder="Category description" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Display Order</label>
                <input type="number" value={categoryFormData.displayOrder} onChange={(e) => setCategoryFormData({ ...categoryFormData, displayOrder: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL</label>
                <input type="text" value={categoryFormData.image} onChange={(e) => setCategoryFormData({ ...categoryFormData, image: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="https://..." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="categoryActive" checked={categoryFormData.isActive} onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="categoryActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveCategory} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">{editingCategory ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier Modal */}
      {showModifierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editingModifier ? 'Edit Modifier' : 'Add New Modifier'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Menu Item *</label>
                <select value={modifierFormData.menuItemId} onChange={(e) => setModifierFormData({ ...modifierFormData, menuItemId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="">Select menu item</option>
                  {items?.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input type="text" value={modifierFormData.name} onChange={(e) => setModifierFormData({ ...modifierFormData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Modifier name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                <select value={modifierFormData.type} onChange={(e) => setModifierFormData({ ...modifierFormData, type: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="single">Single Selection</option>
                  <option value="multiple">Multiple Selection</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Display Order</label>
                <input type="number" value={modifierFormData.displayOrder} onChange={(e) => setModifierFormData({ ...modifierFormData, displayOrder: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="modifierRequired" checked={modifierFormData.isRequired} onChange={(e) => setModifierFormData({ ...modifierFormData, isRequired: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="modifierRequired" className="text-sm text-gray-700">Required</label>
              </div>

              {/* Options Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Options *</label>
                  <button onClick={addModifierOption} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">+ Add Option</button>
                </div>
                {modifierFormData.options.map((option, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => updateModifierOption(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Option name"
                      />
                      {modifierFormData.options.length > 1 && (
                        <button onClick={() => removeModifierOption(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Price Adjustment</label>
                        <input
                          type="number"
                          step="0.01"
                          value={option.priceAdjustment}
                          onChange={(e) => updateModifierOption(index, 'priceAdjustment', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Display Order</label>
                        <input
                          type="number"
                          value={option.displayOrder}
                          onChange={(e) => updateModifierOption(index, 'displayOrder', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={option.isDefault}
                        onChange={(e) => updateModifierOption(index, 'isDefault', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label className="text-xs text-gray-600">Default Option</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModifierModal(false); setEditingModifier(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveModifier} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">{editingModifier ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Combo Modal */}
      {showComboModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editingCombo ? 'Edit Combo' : 'Add New Combo'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input type="text" value={comboFormData.name} onChange={(e) => setComboFormData({ ...comboFormData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="Combo name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea value={comboFormData.description} onChange={(e) => setComboFormData({ ...comboFormData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" rows={3} placeholder="Combo description" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Price *</label>
                <input type="number" step="0.01" value={comboFormData.price} onChange={(e) => setComboFormData({ ...comboFormData, price: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                <input type="datetime-local" value={comboFormData.startDate} onChange={(e) => setComboFormData({ ...comboFormData, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                <input type="datetime-local" value={comboFormData.endDate} onChange={(e) => setComboFormData({ ...comboFormData, endDate: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="comboAvailable" checked={comboFormData.isAvailable} onChange={(e) => setComboFormData({ ...comboFormData, isAvailable: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="comboAvailable" className="text-sm text-gray-700">Available</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="comboActive" checked={comboFormData.isActive} onChange={(e) => setComboFormData({ ...comboFormData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="comboActive" className="text-sm text-gray-700">Active</label>
              </div>

              {/* Items Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Items *</label>
                  <button onClick={addComboItem} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">+ Add Item</button>
                </div>
                {comboFormData.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="flex gap-2 mb-2">
                      <select
                        value={item.menuItemId}
                        onChange={(e) => updateComboItem(index, 'menuItemId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">Select menu item</option>
                        {items?.map((menuItem: any) => <option key={menuItem.id} value={menuItem.id}>{menuItem.name}</option>)}
                      </select>
                      {comboFormData.items.length > 1 && (
                        <button onClick={() => removeComboItem(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateComboItem(index, 'quantity', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateComboItem(index, 'price', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowComboModal(false); setEditingCombo(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveCombo} className="flex-1 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold">{editingCombo ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedMenuScreen;
