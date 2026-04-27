import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, Bell, UtensilsCrossed, Info, X,
  CookingPot, CreditCard, Pause, Play, BarChart3, FileText, ArrowLeft
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../../hooks/useMenu';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { getHardwareManager } from '../../services/hardwareManager';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

interface Props {
  orderType: string;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  onBack: () => void;
  onSendToKitchen: () => void;
  onCheckout: () => void;
}

const GRADIENT_PRESETS = [
  'from-red-500 to-red-600',
  'from-yellow-500 to-yellow-600',
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-indigo-500 to-indigo-600',
  'from-orange-500 to-orange-600',
  'from-teal-500 to-teal-600',
  'from-cyan-500 to-cyan-600',
];

function getCategoryGradient(categoryName: string): string {
  const hash = categoryName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % GRADIENT_PRESETS.length;
  return `bg-gradient-to-r ${GRADIENT_PRESETS[index]}`;
}

const EnhancedMenuOrdering: React.FC<Props> = ({
  orderType,
  tableNumber,
  customerName,
  onBack,
  onSendToKitchen,
  onCheckout,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemNotes, setShowItemNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [quickQuantity, setQuickQuantity] = useState<Record<string, number>>({});
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidItemId, setVoidItemId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const { currentOrder, addItem, removeItem, voidItem, updateQuantity, updateNotes, setOrderNotes, holdOrder, resumeOrder, removeHeldOrder, heldOrders, getSubtotal, getTax, getServiceCharge, getTotal } = useOrderStore();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const { formatCurrency } = useCurrencyFormatter();

  const { data: categories, isLoading: isLoadingCategories } = useMenuCategories();
  const { data: menuItems, isLoading: isLoadingItems } = useMenuItems({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    available: true,
  });

  const filteredItems = menuItems?.filter((item: any) => {
    if (searchQuery) return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  }) || [];

  // Barcode scanner integration with proper cleanup
  useEffect(() => {
    const hw = getHardwareManager();
    const handleBarcode = (barcode: string) => {
      const item = menuItems?.find((m: any) => m.barcode === barcode);
      if (item) {
        addItem({ menuItemId: item.id, name: item.name, price: item.price, quantity: 1 });
        toast.success(`Added ${item.name}`);
      } else {
        toast.error('Item not found');
      }
    };
    hw.onBarcodeScan(handleBarcode);
    
    // Cleanup: Remove event listener when component unmounts
    return () => {
      // If HardwareManager has cleanup method, call it
      if (typeof hw.offBarcodeScan === 'function') {
        hw.offBarcodeScan(handleBarcode);
      }
    };
  }, [menuItems, addItem]);

  // Keyboard shortcuts from parent (F2, F3) with proper cleanup
  useEffect(() => {
    const handleHoldOrderEvent = () => {
      if (currentOrder.items.length === 0) {
        toast.error('No items to hold');
        return;
      }
      holdOrder();
      toast.success('Order held');
    };
    const handleToggleHeldOrdersEvent = () => setShowHeldOrders(prev => !prev);

    window.addEventListener('pos:hold-order', handleHoldOrderEvent);
    window.addEventListener('pos:toggle-held-orders', handleToggleHeldOrdersEvent);

    return () => {
      window.removeEventListener('pos:hold-order', handleHoldOrderEvent);
      window.removeEventListener('pos:toggle-held-orders', handleToggleHeldOrdersEvent);
    };
  }, [currentOrder.items.length, holdOrder]);

  // Update customer display with total
  useEffect(() => {
    const hw = getHardwareManager();
    if (settings.customerDisplayEnabled) {
      hw.showTotal(getTotal());
    }
  }, [getTotal, settings.customerDisplayEnabled]);

  const handleAddItem = (item: any) => {
    if (!item.isAvailable) {
      toast.error('Item not available');
      return;
    }
    const qty = quickQuantity[item.id] || 1;
    addItem({ menuItemId: item.id, name: item.name, price: item.price, quantity: qty });
    toast.success(`Added ${qty > 1 ? `${qty}x ` : ''}${item.name}`);
    setQuickQuantity((prev) => ({ ...prev, [item.id]: 1 }));
  };

  const handleQuickQuantityChange = (itemId: string, delta: number) => {
    setQuickQuantity((prev) => {
      const current = prev[itemId] || 1;
      const newValue = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [itemId]: newValue };
    });
  };

  const handleSaveNote = (itemId: string) => {
    updateNotes(itemId, noteText);
    setShowItemNotes(null);
    setNoteText('');
    toast.success('Note saved');
  };

  const handleHoldOrder = useCallback(() => {
    if (currentOrder.items.length === 0) {
      toast.error('No items to hold');
      return;
    }
    holdOrder();
    toast.success('Order held');
  }, [currentOrder.items.length, holdOrder]);

  const subtotal = getSubtotal();
  const tax = getTax();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  return (
    <div className="h-full flex flex-col bg-neutral-50 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-neutral-0 border-b-2 border-primary-100 px-8 py-5 shadow-sm flex-shrink-0"
      >
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-3 bg-neutral-100 hover:bg-primary-50 rounded-xl transition-colors border border-neutral-200"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-primary-600" />
            </motion.button>
            <div>
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-black text-neutral-900 font-display"
              >
                Menu
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-neutral-600 mt-1 font-medium"
              >
                {tableNumber ? `Table ${tableNumber}` :
                  orderType === 'PICKUP' ? 'Pickup Order' :
                  orderType === 'TAKEAWAY' ? 'Takeaway Order' :
                  orderType === 'DELIVERY' ? 'Delivery Order' :
                  orderType === 'DINE_IN' ? 'Dine-In Order' : 'Order'}
                {customerName && ` • ${customerName}`}
              </motion.p>
            </div>
          </div>
          <div className="text-right">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-semibold text-neutral-600 uppercase tracking-wider"
            >
              Current Total
            </motion.p>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-black text-primary-600"
            >
              {formatCurrency(total)}
            </motion.p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search items or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-12 py-4 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all text-base"
          />
          {searchQuery && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchQuery('')} 
              className="absolute right-5 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-neutral-400 hover:text-primary-600" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-neutral-0 border-b-2 border-primary-100 px-8 py-4 overflow-x-auto flex-shrink-0"
      >
        <div className="flex gap-3 pb-2">
          {isLoadingCategories ? (
            // Category skeletons
            <>
              <div className="px-6 py-4 rounded-2xl bg-neutral-200 animate-pulse w-28" />
              <div className="px-6 py-4 rounded-2xl bg-neutral-200 animate-pulse w-32" />
              <div className="px-6 py-4 rounded-2xl bg-neutral-200 animate-pulse w-24" />
              <div className="px-6 py-4 rounded-2xl bg-neutral-200 animate-pulse w-36" />
            </>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory('')}
                className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${
                  !selectedCategory
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-500/30'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
                }`}
              >
                All Items
              </motion.button>
              {categories?.map((cat: any, index: number) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-500/30'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
                  }`}
                >
                  {cat.name}
                </motion.button>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Grid */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex-1 overflow-y-auto p-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {isLoadingItems ? (
              // Menu item skeletons
              <>
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-neutral-0 rounded-3xl border-2 border-neutral-100 overflow-hidden shadow-lg">
                    <div className="h-40 bg-neutral-200 animate-pulse" />
                    <div className="p-5 space-y-4">
                      <div className="h-6 bg-neutral-200 rounded-xl animate-pulse w-3/4" />
                      <div className="h-4 bg-neutral-200 rounded-xl animate-pulse w-full" />
                      <div className="h-4 bg-neutral-200 rounded-xl animate-pulse w-1/2" />
                      <div className="flex justify-between items-center pt-3">
                        <div className="h-7 bg-neutral-200 rounded-xl animate-pulse w-20" />
                        <div className="h-10 bg-neutral-200 rounded-xl animate-pulse w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {filteredItems.map((item: any, index: number) => {
              const inCart = currentOrder.items.find((i) => i.menuItemId === item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.03, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -8, scale: 1.02, boxShadow: '0 20px 40px rgba(229, 57, 53, 0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAddItem(item)}
                  className={`bg-neutral-0 rounded-3xl overflow-hidden border-2 transition-all cursor-pointer shadow-lg ${
                    !item.isAvailable
                      ? 'opacity-50 border-neutral-200'
                      : inCart
                      ? 'border-primary-600 shadow-2xl shadow-primary-500/30'
                      : 'border-neutral-200 hover:border-primary-400'
                  }`}
                >
                  <div className="h-44 bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center relative overflow-hidden">
                    {item.image && item.image.startsWith('http') ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-6xl">🍽️</div>';
                        }}
                      />
                    ) : (
                      <div className="text-6xl">{item.image || '🍽️'}</div>
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-white font-black text-lg">Unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-neutral-900 mb-2 truncate text-lg">{item.name}</h3>
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-primary-600">{formatCurrency(item.price)}</p>
                        {inCart && <p className="text-xs text-primary-600 font-bold mt-1">In cart: {inCart.quantity}x</p>}
                      </div>
                      <div className="flex items-center gap-2 bg-neutral-100 rounded-2xl p-1.5 border border-neutral-200">
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickQuantityChange(item.id, -1);
                            }}
                            className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-neutral-50 border border-neutral-200"
                          >
                            <Minus className="w-4 h-4 text-neutral-700" />
                          </motion.button>
                          <span className="w-10 text-center font-black text-neutral-900 text-lg">{quickQuantity[item.id] || 1}</span>
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickQuantityChange(item.id, 1);
                            }}
                            className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-neutral-50 border border-neutral-200"
                          >
                            <Plus className="w-4 h-4 text-neutral-700" />
                          </motion.button>
                        </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </>
          )}
          {!isLoadingItems && filteredItems.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-96 text-neutral-400 col-span-full"
            >
              <UtensilsCrossed className="w-20 h-20 mb-6 text-primary-300" />
              <p className="text-xl font-bold text-neutral-600">No items found</p>
              <p className="text-sm text-neutral-500 mt-2">Try a different search or category</p>
            </motion.div>
          )}
          </div>
        </motion.div>
      {/* END menu grid — cart sidebar follows inside the same flex row */}

      {/* Cart Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="w-80 bg-neutral-0 border-l-2 border-primary-200 flex flex-col shadow-2xl"
      >
          {/* Cart Header */}
          <div className="px-6 py-5 border-b-2 border-primary-100 bg-gradient-to-br from-primary-50 to-neutral-0">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xl font-black text-neutral-900 flex items-center gap-2"
              >
                <Bell className="w-6 h-6 text-primary-600" />
                Current Order
              </motion.h3>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.85, type: "spring" }}
                className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-bold shadow-lg shadow-primary-500/30"
              >
                {currentOrder.items.length}
              </motion.span>
            </div>
            {heldOrders.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(229, 57, 53, 0.05)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowHeldOrders(!showHeldOrders)}
                className="w-full text-left px-4 py-3 bg-neutral-100 border-2 border-neutral-200 rounded-2xl text-sm font-bold text-neutral-700 hover:border-primary-300 transition-colors flex items-center justify-between"
              >
                <span>{heldOrders.length} Held Order{heldOrders.length !== 1 ? 's' : ''}</span>
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </motion.button>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-4 rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-4 text-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-black uppercase tracking-[0.25em] text-primary-600">Journey</span>
                <span className="rounded-full bg-primary-100 px-3 py-1 font-bold text-primary-700">
                  {currentOrder.items.length} item{currentOrder.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white px-3 py-2 text-center border border-primary-100 shadow-sm">
                  <p className="font-bold text-primary-700">1. Build</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Add items</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 text-center border border-primary-100 shadow-sm">
                  <p className="font-bold text-primary-700">2. Review</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Check totals</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 text-center border border-primary-100 shadow-sm">
                  <p className="font-bold text-primary-700">3. Send</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Kitchen</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Held Orders Panel */}
          <AnimatePresence>
            {showHeldOrders && heldOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b-2 border-primary-100 bg-neutral-50 p-4 space-y-2"
              >
                {heldOrders.map((held) => (
                  <div key={held.id} className="bg-white rounded-2xl p-4 border-2 border-neutral-200 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-neutral-900 text-sm">{held.customerName || 'Order'}</p>
                        <p className="text-xs text-neutral-600">{held.items.length} items</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeHeldOrder(held.id)}
                        className="p-2 hover:bg-error-100 rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4 text-error-600" />
                      </motion.button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => resumeOrder(held.id)}
                      className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Play className="w-3 h-3" />
                      Resume
                    </motion.button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <AnimatePresence>
              {currentOrder.items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 text-neutral-400"
                >
                  <Bell className="w-16 h-16 mx-auto mb-4 text-primary-300" />
                  <p className="text-xl font-black text-neutral-600">Cart is empty</p>
                  <p className="mt-2 text-sm text-neutral-500">Start by picking a category, then tap items to build the order.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-400">
                    <span className="rounded-full bg-primary-50 px-4 py-2 border border-primary-200">Fast add</span>
                    <span className="rounded-full bg-primary-50 px-4 py-2 border border-primary-200">Notes</span>
                    <span className="rounded-full bg-primary-50 px-4 py-2 border border-primary-200">Hold order</span>
                  </div>
                </motion.div>
              ) : (
                currentOrder.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-2xl p-5 border-2 border-neutral-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900 text-lg">{item.name}</h4>
                        <p className="text-sm text-neutral-600">{formatCurrency(item.price)} each</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setVoidItemId(item.id);
                          setVoidReason('');
                          setShowVoidModal(true);
                        }}
                        className="p-2 hover:bg-error-100 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-error-600" />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-neutral-100 rounded-2xl p-1.5 border border-neutral-200">
                        <motion.button
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-9 h-9 rounded-xl hover:bg-neutral-50 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4 text-neutral-700" />
                        </motion.button>
                        <span className="w-10 text-center font-black text-neutral-900 text-lg">{item.quantity}</span>
                        <motion.button
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-9 h-9 rounded-xl hover:bg-neutral-50 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-neutral-700" />
                        </motion.button>
                      </div>
                      <p className="text-xl font-black text-primary-600">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                    {item.notes && (
                      <div className="mt-3 p-3 bg-warning-50 border-2 border-warning-200 rounded-xl">
                        <p className="text-xs text-warning-800 italic">"{item.notes}"</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowItemNotes(item.id);
                        setNoteText(item.notes || '');
                      }}
                      className="mt-3 text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Info className="w-3 h-3" />
                      {item.notes ? 'Edit Note' : 'Add Note'}
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Cart Footer */}
          <div className="border-t-2 border-primary-100 p-6 space-y-4 bg-neutral-0 flex-shrink-0">
            {/* Order Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-primary-600" />
                Order Notes
              </label>
              <textarea
                value={currentOrder.notes || ''}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Add special instructions for the kitchen..."
                className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-sm text-neutral-900 resize-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 placeholder:text-neutral-400"
                rows={2}
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600 font-medium">Subtotal</span>
                <span className="font-bold text-neutral-900">{formatCurrency(subtotal)}</span>
              </div>
              {settings.taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-600 font-medium">Tax ({settings.taxRate}%)</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(tax)}</span>
                </div>
              )}
              {settings.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-600 font-medium">Service ({settings.serviceCharge}%)</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(serviceCharge)}</span>
                </div>
              )}
              <div className="border-t-2 border-neutral-200 pt-3 flex justify-between">
                <span className="text-lg font-black text-neutral-900">Total</span>
                <span className="text-3xl font-black text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleHoldOrder}
                disabled={currentOrder.items.length === 0}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Pause className="w-5 h-5" />
                Hold Order
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onSendToKitchen}
                disabled={currentOrder.items.length === 0}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CookingPot className="w-5 h-5" />
                Review & Send to Kitchen
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onCheckout}
                disabled={currentOrder.items.length === 0}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Void Item Modal */}
      <AnimatePresence>
        {showVoidModal && voidItemId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVoidModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-0 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-primary-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-neutral-900 mb-2 flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-error-600" />
                Void Item
              </h3>
              <p className="text-neutral-600 mb-6">
                Please provide a reason for voiding this item.
              </p>
              <div className="space-y-3 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setVoidReason('Customer Changed Mind')} 
                  className={`w-full py-3 px-4 rounded-2xl text-left font-bold transition-all ${voidReason === 'Customer Changed Mind' ? 'bg-error-100 text-error-700 border-2 border-error-500 shadow-md' : 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:border-primary-300'}`}
                >
                  Customer Changed Mind
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setVoidReason('Kitchen Out of Stock')} 
                  className={`w-full py-3 px-4 rounded-2xl text-left font-bold transition-all ${voidReason === 'Kitchen Out of Stock' ? 'bg-error-100 text-error-700 border-2 border-error-500 shadow-md' : 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:border-primary-300'}`}
                >
                  Kitchen Out of Stock
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setVoidReason('Order Mistake')} 
                  className={`w-full py-3 px-4 rounded-2xl text-left font-bold transition-all ${voidReason === 'Order Mistake' ? 'bg-error-100 text-error-700 border-2 border-error-500 shadow-md' : 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:border-primary-300'}`}
                >
                  Order Mistake
                </motion.button>
                <input 
                  type="text" 
                  value={voidReason} 
                  onChange={(e) => setVoidReason(e.target.value)} 
                  placeholder="Other reason..." 
                  className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none" 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowVoidModal(false); setVoidItemId(null); setVoidReason(''); }} 
                  className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (!voidReason.trim()) {
                      toast.error('Please provide a reason for voiding');
                      return;
                    }
                    
                    const itemToVoid = currentOrder.items.find(item => item.id === voidItemId);
                    if (!itemToVoid) return;

                    voidItem(voidItemId!, voidReason, user?.fullName || 'Cashier');
                    
                    toast.success(`Item voided: ${voidReason}`);
                    setShowVoidModal(false);
                    setVoidItemId(null);
                    setVoidReason('');
                  }}
                  disabled={!voidReason.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-error-600 to-error-700 text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg"
                >
                  Confirm Void
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Notes Modal */}
      <AnimatePresence>
        {showItemNotes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowItemNotes(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-0 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-primary-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-neutral-900 mb-4">Special Instructions</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="E.g., No onions, extra cheese, well done..."
                className="w-full h-32 px-4 py-3 border-2 border-neutral-200 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none resize-none text-base"
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowItemNotes(null)}
                  className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => showItemNotes && handleSaveNote(showItemNotes)}
                  className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold hover:shadow-lg transition-all shadow-md"
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedMenuOrdering;
