'use client';

import React, { useState } from 'react';
import { 
  BookOpen, Plus, Search, DollarSign, Package, 
  Calculator, Edit2, Trash2, ChevronRight, Info
} from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface Recipe {
  id: string;
  menuItemId: string;
  menuItemName: string;
  ingredients: Array<{
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
  }>;
  totalCost: number;
  suggestedPrice: number;
  profitMargin: number;
  isActive: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: { name: string };
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    menuItemId: '',
    ingredients: [] as Array<{ inventoryItemId: string; quantity: number }>,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recipesRes, menuRes, inventoryRes] = await Promise.all([
        apiClient.get('/recipes'),
        apiClient.get('/menu/items'),
        apiClient.get('/inventory'),
      ]);
      setRecipes(recipesRes.data?.data?.recipes || []);
      setMenuItems(menuRes.data?.data?.items || []);
      setInventoryItems(inventoryRes.data?.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const calculateRecipeCost = (ingredients: typeof formData.ingredients) => {
    return ingredients.reduce((total, ing) => {
      const item = inventoryItems.find(i => i.id === ing.inventoryItemId);
      if (!item) return total;
      return total + (item.costPerUnit * ing.quantity);
    }, 0);
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/recipes', formData);
      toast.success('Recipe created successfully!');
      setShowAddModal(false);
      setFormData({ menuItemId: '', ingredients: [] });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Delete this recipe?')) return;
    try {
      await apiClient.delete(`/recipes/${id}`);
      toast.success('Recipe deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete recipe');
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.menuItemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: recipes.length,
    active: recipes.filter(r => r.isActive).length,
    avgCost: recipes.length > 0 
      ? recipes.reduce((sum, r) => sum + r.totalCost, 0) / recipes.length 
      : 0,
    avgMargin: recipes.length > 0
      ? recipes.reduce((sum, r) => sum + r.profitMargin, 0) / recipes.length
      : 0,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Recipe Management</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Manage recipes, calculate costs, and optimize pricing
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Create Recipe
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Recipes</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-50 text-green-600">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active Recipes</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.active}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Avg Cost</p>
              <h3 className="text-2xl font-black text-gray-900">${stats.avgCost.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
              <Info size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Avg Margin</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.avgMargin.toFixed(1)}%</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl shadow-soft border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search recipes by menu item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {/* Recipes Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center shadow-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading recipes...</p>
        </div>
      ) : (
        <Table headers={['Menu Item', 'Ingredients', 'Cost', 'Suggested Price', 'Margin', 'Status', 'Actions']}>
          {filteredRecipes.map((recipe) => (
            <TableRow key={recipe.id}>
              <TableCell className="font-bold">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-500" />
                  {recipe.menuItemName}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="neutral">
                  {recipe.ingredients.length} items
                </Badge>
              </TableCell>
              <TableCell className="font-black text-orange-600">
                ${recipe.totalCost.toFixed(2)}
              </TableCell>
              <TableCell className="font-bold text-green-600">
                ${recipe.suggestedPrice.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant={recipe.profitMargin > 60 ? 'success' : recipe.profitMargin > 40 ? 'warning' : 'error'}>
                  {recipe.profitMargin.toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={recipe.isActive ? 'success' : 'neutral'}>
                  {recipe.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRecipe(recipe)}
                    className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredRecipes.length === 0 && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400">
                <BookOpen className="mx-auto mb-2 text-gray-300" size={32} />
                No recipes found
              </TableCell>
            </TableRow>
          )}
        </Table>
      )}

      {/* Add Recipe Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Recipe"
      >
        <form onSubmit={handleAddRecipe} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Menu Item</label>
            <select
              required
              value={formData.menuItemId}
              onChange={(e) => setFormData({ ...formData, menuItemId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
            >
              <option value="">Select Menu Item</option>
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - ${item.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700">Ingredients</label>
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  ingredients: [...formData.ingredients, { inventoryItemId: '', quantity: 1 }]
                })}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                + Add Ingredient
              </button>
            </div>

            {formData.ingredients.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Package className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">No ingredients added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl">
                    <select
                      value={ing.inventoryItemId}
                      onChange={(e) => {
                        const newIngredients = [...formData.ingredients];
                        newIngredients[idx].inventoryItemId = e.target.value;
                        setFormData({ ...formData, ingredients: newIngredients });
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Select Ingredient</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (${item.costPerUnit}/{item.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={ing.quantity}
                      onChange={(e) => {
                        const newIngredients = [...formData.ingredients];
                        newIngredients[idx].quantity = parseFloat(e.target.value);
                        setFormData({ ...formData, ingredients: newIngredients });
                      }}
                      className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newIngredients = formData.ingredients.filter((_, i) => i !== idx);
                        setFormData({ ...formData, ingredients: newIngredients });
                      }}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formData.ingredients.length > 0 && (
              <div className="bg-indigo-50 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-900">Estimated Cost:</span>
                  <span className="text-lg font-black text-indigo-600">
                    ${calculateRecipeCost(formData.ingredients).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              💡 Tip: Add all ingredients used in this recipe. The system will automatically calculate the total cost and suggest optimal pricing.
            </p>
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
              disabled={isSubmitting || !formData.menuItemId || formData.ingredients.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Recipe Details Modal */}
      {selectedRecipe && (
        <Modal
          isOpen={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          title={`Recipe: ${selectedRecipe.menuItemName}`}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase">Total Cost</p>
                <p className="text-2xl font-black text-orange-600">${selectedRecipe.totalCost.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase">Profit Margin</p>
                <p className={`text-2xl font-black ${selectedRecipe.profitMargin > 60 ? 'text-green-600' : selectedRecipe.profitMargin > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {selectedRecipe.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Ingredients Breakdown</h3>
              <div className="space-y-2">
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="font-semibold text-sm">{ing.itemName}</p>
                      <p className="text-xs text-gray-500">{ing.quantity} {ing.unit} × ${ing.costPerUnit}/{ing.unit}</p>
                    </div>
                    <p className="font-bold text-gray-900">${ing.totalCost.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-indigo-900">Suggested Selling Price:</span>
                <span className="text-xl font-black text-indigo-600">${selectedRecipe.suggestedPrice.toFixed(2)}</span>
              </div>
              <p className="text-xs text-indigo-700">
                Based on {selectedRecipe.profitMargin.toFixed(0)}% profit margin target
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
