import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, Bell, UtensilsCrossed, Info, X,
  CookingPot, CreditCard, Pause, Play, BarChart3, FileText, ArrowLeft,
  ChevronRight
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

  // Server already filters by `search` param — no need to duplicate client-side
  const filteredItems = menuItems || [];

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

  // Build order context label
  const orderContextLabel = tableNumber
    ? `Table ${tableNumber} • Dine-In`
    : orderType === 'PICKUP'
    ? 'Counter Pickup'
    : orderType === 'TAKEAWAY'
    ? 'Takeaway'
    : orderType === 'DELIVERY'
    ? 'Delivery'
    : orderType === 'DINE_IN'
    ? 'Dine-In'
    : 'Order';

  return (
    <div className="h-full flex flex-col bg-neutral-50 overflow-hidden">

      {/* ── COMPACT HEADER BAR (~56px) ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-b border-neutral-200 px-4 flex items-center gap-3 h-14 flex-shrink-0 shadow-sm"
      >
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.08, backgroundColor: 'rgba(229,57,53,0.08)' }}
          whileTap={{ scale: 0.93 }}
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-primary-50 border border-neutral-200 flex-shrink-0 transition-colors"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4 text-primary-600" />
        </motion.button>

        {/* Order type pill */}
        <div className="flex-shrink-0 px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-black uppercase tracking-wide leading-none flex items-center h-7">
          {orderContextLabel}{customerName ? ` • ${customerName}` : ''}
        </div>

        {/* Search — flex-1 to fill remaining space */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-neutral-400 hover:text-primary-600 transition-colors" />
            </button>
          )}
        </div>
      </motion.div>

      {/* ── CATEGORY TABS ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-white border-b border-neutral-200 px-4 overflow-x-auto flex-shrink-0 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex gap-1 min-w-max">
          {isLoadingCategories ? (
            <>
              {[80, 96, 72, 112].map((w, i) => (
                <div key={i} className="my-2 h-8 rounded bg-neutral-200 animate-pulse" style={{ width: w }} />
              ))}
            </>
          ) : (
            <>
              {/* All */}
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                  !selectedCategory
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                All
              </button>
              {categories?.map((cat: any, index: number) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + index * 0.04 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                    selectedCategory === cat.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {cat.name}
                </motion.button>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* ── MAIN CONTENT ROW ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── MENU GRID ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 overflow-y-auto p-4"
        >
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {isLoadingItems ? (
              <>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border-2 border-neutral-100 overflow-hidden">
                    <div className="h-28 bg-neutral-200 animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                      <div className="h-5 bg-neutral-200 rounded animate-pulse w-1/2" />
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
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.22 + index * 0.025, type: 'spring', stiffness: 220 }}
                      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(229,57,53,0.12)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAddItem(item)}
                      className={`bg-white rounded-2xl overflow-hidden border-2 transition-colors cursor-pointer relative ${
                        !item.isAvailable
                          ? 'opacity-50 border-neutral-200'
                          : inCart
                          ? 'border-primary-600'
                          : 'border-neutral-200 hover:border-primary-400'
                      }`}
                    >
                      {/* Cart quantity badge — top-right corner */}
                      {inCart && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-black flex items-center justify-center shadow-md">
                          {inCart.quantity}
                        </div>
                      )}

                      {/* Image area — compact h-28 */}
                      <div className="h-28 bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center relative overflow-hidden">
                        {item.image && item.image.startsWith('http') ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-5xl">🍽️</div>';
                            }}
                          />
                        ) : (
                          <div className="text-5xl">{item.image || '🍽️'}</div>
                        )}
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-white font-black text-sm">Unavailable</span>
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-3 flex flex-col gap-1.5">
                        <h3 className="font-bold text-sm text-neutral-900 truncate leading-tight">{item.name}</h3>

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-primary-600 leading-none">{formatCurrency(item.price)}</span>

                          {/* Add / qty controls */}
                          {inCart ? (
                            <div
                              className="flex items-center gap-0.5 bg-neutral-100 rounded-full px-1 py-0.5 border border-neutral-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(inCart.id, Math.max(1, inCart.quantity - 1));
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                              >
                                <Minus className="w-3 h-3 text-neutral-700" />
                              </motion.button>
                              <span className="w-6 text-center text-xs font-black text-neutral-900">{inCart.quantity}</span>
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(inCart.id, inCart.quantity + 1);
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                              >
                                <Plus className="w-3 h-3 text-neutral-700" />
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: '#D32F2F' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddItem(item);
                              }}
                              className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md flex-shrink-0 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}

            {!isLoadingItems && filteredItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full flex flex-col items-center justify-center py-24 text-neutral-400"
              >
                <UtensilsCrossed className="w-16 h-16 mb-4 text-primary-300" />
                <p className="text-lg font-bold text-neutral-600">No items found</p>
                <p className="text-sm text-neutral-500 mt-1">Try a different search or category</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── CART SIDEBAR (w-96) ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="w-96 bg-white border-l border-neutral-200 flex flex-col shadow-xl flex-shrink-0"
        >
          {/* Cart Header */}
          <div className="px-4 pt-3 pb-3 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-neutral-900">Current Order</h3>
              <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-black flex items-center justify-center shadow">
                {currentOrder.items.length}
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">{orderContextLabel}{customerName ? ` • ${customerName}` : ''}</p>

            {/* Held orders toggle pill */}
            {heldOrders.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowHeldOrders(!showHeldOrders)}
                className="mt-2 w-full flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:border-amber-400 transition-colors"
              >
                <span>{heldOrders.length} Held Order{heldOrders.length !== 1 ? 's' : ''}</span>
                <BarChart3 className="w-3.5 h-3.5" />
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
                className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 space-y-2 overflow-hidden"
              >
                {heldOrders.map((held) => (
                  <div key={held.id} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-sm flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate">{held.customerName || 'Held Order'}</p>
                      <p className="text-[10px] text-neutral-500">{held.items.length} items</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => resumeOrder(held.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-primary-600 text-white rounded-lg text-[10px] font-bold transition-colors hover:bg-primary-700"
                    >
                      <Play className="w-2.5 h-2.5" />
                      Resume
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeHeldOrder(held.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </motion.button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            <AnimatePresence>
              {currentOrder.items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-neutral-400"
                >
                  <UtensilsCrossed className="w-12 h-12 mb-3 text-primary-200" />
                  <p className="text-base font-black text-neutral-500">Cart empty</p>
                  <p className="text-xs text-neutral-400 mt-1">Tap items to add</p>
                </motion.div>
              ) : (
                currentOrder.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="bg-neutral-50 rounded-xl px-3 py-2 border border-neutral-200"
                  >
                    {/* Row: qty pill | name | price | remove */}
                    <div className="flex items-center gap-2">
                      {/* Inline qty controls */}
                      <div className="flex items-center gap-0.5 bg-white border border-neutral-200 rounded-full px-1 py-0.5 flex-shrink-0">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                        >
                          <Minus className="w-2.5 h-2.5 text-neutral-600" />
                        </motion.button>
                        <span className="w-5 text-center text-xs font-black text-neutral-900">{item.quantity}</span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5 text-neutral-600" />
                        </motion.button>
                      </div>

                      {/* Name — click to open notes */}
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => {
                          setShowItemNotes(item.id);
                          setNoteText(item.notes || '');
                        }}
                      >
                        <span className="text-sm font-semibold text-neutral-900 truncate block">{item.name}</span>
                      </button>

                      {/* Line price */}
                      <span className="text-sm font-black text-primary-600 flex-shrink-0">{formatCurrency(item.price * item.quantity)}</span>

                      {/* Remove */}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                          if (item.quantity === 1) {
                            setVoidItemId(item.id);
                            setVoidReason('');
                            setShowVoidModal(true);
                          } else {
                            updateQuantity(item.id, item.quantity - 1);
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </motion.button>
                    </div>

                    {/* Notes if present */}
                    {item.notes && (
                      <p className="mt-1 ml-8 text-[10px] text-neutral-500 italic truncate">"{item.notes}"</p>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Cart Footer */}
          <div className="border-t border-neutral-200 px-4 py-3 space-y-2.5 bg-white flex-shrink-0">
            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="font-semibold text-neutral-800">{formatCurrency(subtotal)}</span>
              </div>
              {settings.taxRate > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Tax ({settings.taxRate}%)</span>
                  <span className="font-semibold text-neutral-800">{formatCurrency(tax)}</span>
                </div>
              )}
              {settings.serviceCharge > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Service ({settings.serviceCharge}%)</span>
                  <span className="font-semibold text-neutral-800">{formatCurrency(serviceCharge)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-neutral-200 pt-2">
                <span className="text-base font-black text-neutral-900">TOTAL</span>
                <span className="text-2xl font-black text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Hold */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleHoldOrder}
                disabled={currentOrder.items.length === 0}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Hold Order
              </motion.button>

              {/* Send to Kitchen */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSendToKitchen}
                disabled={currentOrder.items.length === 0}
                className="w-full py-3 border-2 border-primary-600 text-primary-600 hover:bg-primary-50 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CookingPot className="w-4 h-4" />
                Send to Kitchen
              </motion.button>

              {/* Checkout — primary CTA */}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(229,57,53,0.35)' }}
                whileTap={{ scale: 0.97 }}
                onClick={onCheckout}
                disabled={currentOrder.items.length === 0}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-black text-base shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                CHECKOUT
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── VOID ITEM MODAL ────────────────────────────────────────────── */}
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
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-primary-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black text-neutral-900 mb-2 flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-red-600" />
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
                  className={`w-full py-3 px-4 rounded-2xl text-left font-bold transition-all ${voidReason === 'Customer Changed Mind' ? 'bg-red-50 text-red-700 border-2 border-red-500 shadow-md' : 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:border-primary-300'}`}
                >
                  Customer Changed Mind
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setVoidReason('Kitchen Out of Stock')}
                  className={`w-full py-3 px-4 rounded-2xl text-left font-bold transition-all ${voidReason === 'Kitchen Out of Stock' ? 'bg-red-50 text-red-700 border-2 border-red-500 shadow-md' : 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:border-primary-300'}`}
                >
                  Kitchen Out of Stock
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setVoidReason('Order Mistake')}
                  className={`w-full py-3 px-4 rounded-2xl text-left font-bold transition-all ${voidReason === 'Order Mistake' ? 'bg-red-50 text-red-700 border-2 border-red-500 shadow-md' : 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:border-primary-300'}`}
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
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-bold disabled:opacity-50 shadow-lg"
                >
                  Confirm Void
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ITEM NOTES MODAL ───────────────────────────────────────────── */}
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
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-primary-200"
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
