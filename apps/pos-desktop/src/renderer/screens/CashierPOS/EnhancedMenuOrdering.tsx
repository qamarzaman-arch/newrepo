import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, Bell, UtensilsCrossed, Info, X,
  CookingPot, CreditCard, Pause, Play, BarChart3, FileText, ArrowLeft
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../../hooks/useMenu';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
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

// Static Tailwind classes for category tabs
const categoryConfig: Record<string, { gradientClass: string }> = {
  Pizza: { gradientClass: 'bg-gradient-to-r from-red-500 to-red-600' },
  Pasta: { gradientClass: 'bg-gradient-to-r from-yellow-500 to-yellow-600' },
  Drinks: { gradientClass: 'bg-gradient-to-r from-blue-500 to-blue-600' },
  Salads: { gradientClass: 'bg-gradient-to-r from-green-500 to-green-600' },
  Sandwiches: { gradientClass: 'bg-gradient-to-r from-purple-500 to-purple-600' },
  Desserts: { gradientClass: 'bg-gradient-to-r from-pink-500 to-pink-600' },
};

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
  const [voidedItems, setVoidedItems] = useState<Array<{itemId: string, itemName: string, reason: string, timestamp: string}>>([]);

  const { currentOrder, addItem, removeItem, updateQuantity, updateNotes, setOrderNotes, holdOrder, resumeOrder, removeHeldOrder, heldOrders, getSubtotal, getTax, getServiceCharge, getTotal } = useOrderStore();
  const { settings } = useSettingsStore();
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
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-end justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-manrope">Menu</h2>
              <p className="text-sm text-gray-500 mt-1">
                {tableNumber ? `Table ${tableNumber}` :
                  orderType === 'TAKEAWAY' ? 'Takeaway Order' :
                  orderType === 'DELIVERY' ? 'Delivery Order' :
                  orderType === 'DINE_IN' ? 'Dine-In Order' : 'Order'}
                {customerName && ` • ${customerName}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Total</p>
            <p className="text-3xl font-black text-primary">{formatCurrency(total)}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search items or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:bg-white transition-all text-base"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 overflow-x-auto flex-shrink-0">
        <div className="flex gap-3 pb-2">
          {isLoadingCategories ? (
            // Category skeletons
            <>
              <div className="px-6 py-3 rounded-xl bg-gray-200 animate-pulse w-24" />
              <div className="px-6 py-3 rounded-xl bg-gray-200 animate-pulse w-28" />
              <div className="px-6 py-3 rounded-xl bg-gray-200 animate-pulse w-20" />
              <div className="px-6 py-3 rounded-xl bg-gray-200 animate-pulse w-32" />
            </>
          ) : (
            <>
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
              {categories?.map((cat: any) => (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? `${categoryConfig[cat.name]?.gradientClass || 'bg-gradient-to-r from-gray-500 to-gray-600'} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </motion.button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoadingItems ? (
              // Menu item skeletons
              <>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="h-32 bg-gray-200 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {filteredItems.map((item: any) => {
              const inCart = currentOrder.items.find((i) => i.menuItemId === item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleAddItem(item)}
                  className={`bg-white rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    !item.isAvailable
                      ? 'opacity-50 border-gray-200'
                      : inCart
                      ? 'border-primary shadow-lg'
                      : 'border-gray-100 hover:border-primary/50'
                  }`}
                >
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    {item.image && item.image.startsWith('http') ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-5xl">🍽️</div>';
                        }}
                      />
                    ) : (
                      <div className="text-5xl">{item.image || '🍽️'}</div>
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold">Unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-primary">{formatCurrency(item.price)}</p>
                        {inCart && <p className="text-xs text-primary font-semibold">In cart: {inCart.quantity}x</p>}
                      </div>
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
                          <span className="w-8 text-center font-bold text-gray-900">{quickQuantity[item.id] || 1}</span>
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
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </>
          )}
          {!isLoadingItems && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <UtensilsCrossed className="w-16 h-16 mb-4" />
              <p className="text-lg font-semibold">No items found</p>
            </div>
          )}
        </div>
      </div>
      {/* END menu grid — cart sidebar follows inside the same flex row */}

      {/* Cart Sidebar */}
      <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl">
          {/* Cart Header */}
          <div className="px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-gray-800 to-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Current Order
              </h3>
              <span className="px-3 py-1 bg-primary text-white rounded-full text-sm font-bold">
                {currentOrder.items.length}
              </span>
            </div>
            {heldOrders.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowHeldOrders(!showHeldOrders)}
                className="w-full text-left px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-semibold text-white hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <span>{heldOrders.length} Held Order{heldOrders.length !== 1 ? 's' : ''}</span>
                <BarChart3 className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          {/* Held Orders Panel */}
          <AnimatePresence>
            {showHeldOrders && heldOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-700 bg-gray-800 p-4 space-y-2"
              >
                {heldOrders.map((held) => (
                  <div key={held.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{held.customerName || 'Order'}</p>
                        <p className="text-xs text-gray-400">{held.items.length} items</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeHeldOrder(held.id)}
                        className="p-1 hover:bg-red-900/50 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => resumeOrder(held.id)}
                      className="w-full py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-lg text-xs font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {currentOrder.items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-400"
                >
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Cart is empty</p>
                </motion.div>
              ) : (
                currentOrder.items.map((item) => (
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
                        <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setVoidItemId(item.id);
                          setVoidReason('');
                          setShowVoidModal(true);
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </motion.button>
                    </div>
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
                      <p className="text-lg font-black text-primary">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
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
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Cart Footer */}
          <div className="border-t border-gray-800 p-6 space-y-4 bg-gray-900 flex-shrink-0">
            {/* Order Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Order Notes
              </label>
              <textarea
                value={currentOrder.notes || ''}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Add special instructions for the kitchen..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-gray-500"
                rows={2}
              />
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
              </div>
              {settings.taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax ({settings.taxRate}%)</span>
                  <span className="font-semibold text-white">{formatCurrency(tax)}</span>
                </div>
              )}
              {settings.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Service ({settings.serviceCharge}%)</span>
                  <span className="font-semibold text-white">{formatCurrency(serviceCharge)}</span>
                </div>
              )}
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleHoldOrder}
                disabled={currentOrder.items.length === 0}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Pause className="w-5 h-5" />
                Hold Order
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSendToKitchen}
                disabled={currentOrder.items.length === 0}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CookingPot className="w-5 h-5" />
                Send to Kitchen
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCheckout}
                disabled={currentOrder.items.length === 0}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout
              </motion.button>
            </div>
          </div>
        </div>
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
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-red-500" />
                Void Item
              </h3>
              <p className="text-gray-600 mb-6">
                Please provide a reason for voiding this item.
              </p>
              <div className="space-y-3 mb-6">
                <button onClick={() => setVoidReason('Customer Changed Mind')} className={`w-full py-3 px-4 rounded-xl text-left font-medium ${voidReason === 'Customer Changed Mind' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-100 text-gray-700'}`}>Customer Changed Mind</button>
                <button onClick={() => setVoidReason('Kitchen Out of Stock')} className={`w-full py-3 px-4 rounded-xl text-left font-medium ${voidReason === 'Kitchen Out of Stock' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-100 text-gray-700'}`}>Kitchen Out of Stock</button>
                <button onClick={() => setVoidReason('Order Mistake')} className={`w-full py-3 px-4 rounded-xl text-left font-medium ${voidReason === 'Order Mistake' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-100 text-gray-700'}`}>Order Mistake</button>
                <input type="text" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Other reason..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowVoidModal(false); setVoidItemId(null); setVoidReason(''); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold">Cancel</button>
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

                    // Record audit trail for pre-order voids in order notes
                    const voidNote = `VOID: ${itemToVoid.name} (${voidReason}) at ${new Date().toLocaleTimeString()}`;
                    const currentNotes = currentOrder.notes || '';
                    setOrderNotes(currentNotes ? `${currentNotes}\n${voidNote}` : voidNote);
                    
                    // Track voided items for audit
                    setVoidedItems(prev => [
                      ...prev,
                      {
                        itemId: voidItemId!,
                        itemName: itemToVoid.name,
                        reason: voidReason,
                        timestamp: new Date().toISOString(),
                      }
                    ]);
                    
                    removeItem(voidItemId!);
                    toast.success(`Item voided: ${voidReason}`);
                    setShowVoidModal(false);
                    setVoidItemId(null);
                    setVoidReason('');
                  }}
                  disabled={!voidReason.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold disabled:opacity-50"
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
              <h3 className="text-xl font-bold text-gray-900 mb-4">Special Instructions</h3>
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
                  Save
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
