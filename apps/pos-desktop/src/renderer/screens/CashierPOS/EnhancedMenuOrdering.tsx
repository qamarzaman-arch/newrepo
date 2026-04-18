import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, Bell, UtensilsCrossed,
  Pizza, Coffee, Salad, Sandwich, IceCream,
  Clock, Flame, Leaf, Info, X, CookingPot, CreditCard
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../../hooks/useMenu';
import { useOrderStore } from '../../stores/orderStore';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/currency';

interface EnhancedMenuOrderingProps {
  orderType: string;
  tableId?: string;
  customerName?: string;
  onBack: () => void;
  onSendToKitchen: () => void;
  onCheckout: () => void;
}

const categoryConfig: Record<string, { icon: any; color: string; gradient: string }> = {
  Burgers: { icon: UtensilsCrossed, color: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
  Pizza: { icon: Pizza, color: 'text-red-600', gradient: 'from-red-500 to-red-600' },
  Pasta: { icon: UtensilsCrossed, color: 'text-yellow-600', gradient: 'from-yellow-500 to-yellow-600' },
  Drinks: { icon: Coffee, color: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  Salads: { icon: Salad, color: 'text-green-600', gradient: 'from-green-500 to-green-600' },
  Sandwiches: { icon: Sandwich, color: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
  Desserts: { icon: IceCream, color: 'text-pink-600', gradient: 'from-pink-500 to-pink-600' },
  Default: { icon: UtensilsCrossed, color: 'text-gray-600', gradient: 'from-gray-500 to-gray-600' },
};

const EnhancedMenuOrdering: React.FC<EnhancedMenuOrderingProps> = ({
  orderType,
  tableId,
  customerName,
  onSendToKitchen,
  onCheckout,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemNotes, setShowItemNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [quickQuantity, setQuickQuantity] = useState<Record<string, number>>({});

  const { currentOrder, addItem, removeItem, updateQuantity, updateNotes, getSubtotal, getTotal } =
    useOrderStore();

  // Fetch data from API
  const { data: categories } = useMenuCategories();
  const { data: menuItems } = useMenuItems({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    available: true,
  });

  const filteredItems = menuItems?.filter((item: any) => {
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  }) || [];

  const handleAddItem = (item: any) => {
    if (!item.isAvailable) {
      toast.error('This item is not available');
      return;
    }

    const qty = quickQuantity[item.id] || 1;
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: qty,
    });
    
    if (qty > 1) {
      toast.success(`Added ${qty}x ${item.name}`);
    } else {
      toast.success(`Added ${item.name}`);
    }
    
    // Reset quick quantity
    setQuickQuantity(prev => ({ ...prev, [item.id]: 1 }));
  };

  const handleQuickQuantityChange = (itemId: string, delta: number) => {
    setQuickQuantity(prev => {
      const current = prev[itemId] || 1;
      const newValue = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [itemId]: newValue };
    });
  };

  const handleSaveNote = (itemId: string) => {
    updateNotes(itemId, noteText);
    setShowItemNotes(null);
    setNoteText('');
    toast.success('Note added');
  };

  const subtotal = getSubtotal();
  const tax = subtotal * 0.085;
  const total = getTotal();

  const getCategoryConfig = (categoryName: string) => {
    return categoryConfig[categoryName] || categoryConfig.Default;
  };

  const getItemBadge = (item: any) => {
    if (item.isPopular) return { icon: Flame, label: 'Popular', color: 'bg-red-500' };
    if (item.isHealthy) return { icon: Leaf, label: 'Healthy', color: 'bg-green-500' };
    if (item.prepTime && item.prepTime <= 10) return { icon: Clock, label: 'Quick', color: 'bg-blue-500' };
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Order Info */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-manrope">Menu</h2>
            <p className="text-sm text-gray-600 mt-1">
              {orderType === 'DINE_IN' && `Table ${tableId}`}
              {orderType === 'TAKEAWAY' && 'Takeaway Order'}
              {orderType === 'DELIVERY' && 'Delivery Order'}
              {customerName && ` • ${customerName}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Total</p>
            <p className="text-3xl font-black text-primary">{formatCurrency(total)}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:bg-white transition-all text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs - Horizontal Scrollable */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory('')}
            className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
              !selectedCategory
                ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </motion.button>
          
          {categories?.map((category: any) => {
            const config = getCategoryConfig(category.name);
            const Icon = config.icon;
            return (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {category.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item: any) => {
              const badge = getItemBadge(item);
              const inCart = currentOrder.items.find((i) => i.menuItemId === item.id);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                  className={`bg-white rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    !item.isAvailable 
                      ? 'opacity-50 border-gray-200' 
                      : inCart 
                        ? 'border-primary shadow-lg' 
                        : 'border-gray-100 hover:border-primary/50'
                  }`}
                  onClick={() => handleAddItem(item)}
                >
                  {/* Item Image Placeholder */}
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
                    {/* Display emoji image or fallback */}
                    <div className="text-6xl">
                      {item.image || '🍽️'}
                    </div>
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Unavailable</span>
                      </div>
                    )}
                    {badge && badge.icon && (
                      <div className={`absolute top-3 left-3 ${badge.color} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                        {React.createElement(badge.icon, { className: 'w-3 h-3' })}
                        {badge.label}
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-primary">{formatCurrency(Number(item.price))}</p>
                        {inCart && (
                          <p className="text-xs text-primary font-semibold">In cart: {inCart.quantity}x</p>
                        )}
                      </div>
                      
                      {/* Quick Quantity Controls */}
                      {!inCart && (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickQuantityChange(item.id, -1);
                            }}
                            className="w-8 h-8 rounded-md bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="w-4 h-4 text-gray-700" />
                          </motion.button>
                          <span className="w-8 text-center font-bold text-gray-900">
                            {quickQuantity[item.id] || 1}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickQuantityChange(item.id, 1);
                            }}
                            className="w-8 h-8 rounded-md bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus className="w-4 h-4 text-gray-700" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <UtensilsCrossed className="w-16 h-16 mb-4" />
              <p className="text-lg font-semibold">No items found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
          {/* Cart Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary-container/5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Current Order
              </h3>
              <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-bold">
                {currentOrder.items.length} items
              </span>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {currentOrder.items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">${Number(item.price).toFixed(2)} each</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeItem(item.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </motion.button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </motion.button>
                      <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </motion.button>
                    </div>
                    <p className="text-lg font-black text-primary">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800 italic">"{item.notes}"</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowItemNotes(item.id);
                      setNoteText(item.notes || '');
                    }}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" />
                    {item.notes ? 'Edit Note' : 'Add Note'}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {currentOrder.items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Bell className="w-12 h-12 mb-3" />
                <p className="text-sm font-semibold">Cart is empty</p>
                <p className="text-xs">Add items from the menu</p>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (8.5%)</span>
                <span className="font-semibold">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-black text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSendToKitchen}
                disabled={currentOrder.items.length === 0}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CookingPot className="w-6 h-6" />
                Send to Kitchen
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCheckout}
                disabled={currentOrder.items.length === 0}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-6 h-6" />
                Proceed to Checkout
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Notes Modal */}
      <AnimatePresence>
        {showItemNotes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowItemNotes(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Add Special Instructions</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="E.g., No onions, extra cheese, well done..."
                className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none resize-none text-base"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowItemNotes(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveNote(showItemNotes)}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedMenuOrdering;
