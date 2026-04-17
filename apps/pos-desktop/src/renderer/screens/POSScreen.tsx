import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  SplitSquareHorizontal,
  X,
  ShoppingCart,
  Users,
  Package,
  Truck,
  Calendar,
  MapPin,
} from 'lucide-react';
import { useOrderStore, OrderItem } from '../stores/orderStore';
import { useMenuCategories, useMenuItems } from '../hooks/useMenu';
import { orderService } from '../services/orderService';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const POSScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showItemNotes, setShowItemNotes] = useState<string | null>(null);
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'RESERVATION'>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();

  const { currentOrder, addItem, removeItem, updateQuantity, clearOrder, getSubtotal, getTotal } = useOrderStore();

  // Fetch data from API
  const { data: categories, isLoading: loadingCategories } = useMenuCategories();
  const { data: menuItems, isLoading: loadingItems } = useMenuItems({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    available: true,
  });
  
  // Note: tables removed - use new CashierPOS flow for table selection
  const tables: any[] = [];

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

    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
    toast.success(`Added ${item.name}`);
  };

  const handleOrderTypeChange = (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'RESERVATION') => {
    if (type === 'DINE_IN' && !selectedTableId) {
      setShowTableSelection(true);
      return;
    }
    setOrderType(type);
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    setShowTableSelection(false);
    toast.success('Table selected!');
  };

  const handleCheckout = async () => {
    if (currentOrder.items.length === 0) {
      toast.error('Please add items to the order');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = async (method: string) => {
    setIsSubmitting(true);

    try {
      // Create order
      const orderData = {
        orderType,
        items: currentOrder.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      };

      const response = await orderService.createOrder(orderData);
      const order = response.data.data.order;

      // Process payment
      await orderService.processPayment(order.id, {
        method: method.toUpperCase(),
        amount: getTotal(),
      });

      toast.success(`Order created and payment processed via ${method}!`);
      setShowPaymentModal(false);
      clearOrder();
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotal();

  if (loadingCategories || loadingItems) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 lg:p-6">
      {/* Left Panel - Menu */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {categories?.map((category: any) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? '' : category.id)}
              className={`flex items-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-medium'
                  : 'bg-surface-container text-gray-700 hover:bg-surface-container-lowest'
              }`}
            >
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Menu Items Grid - Responsive */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
            {filteredItems.map((item: any) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAddItem(item)}
                disabled={!item.isAvailable}
                className={`bg-surface-lowest rounded-xl md:rounded-2xl p-3 md:p-4 shadow-soft hover:shadow-medium transition-all text-left ${
                  !item.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-4xl md:text-5xl mb-2 md:mb-3">{item.image || '🍽️'}</div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">{item.name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2 hidden sm:block">{item.description}</p>
                <p className="text-base md:text-lg font-bold text-primary">{formatCurrency(item.price)}</p>
                {!item.isAvailable && (
                  <p className="text-xs text-red-500 mt-1">Unavailable</p>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Current Order */}
      <div className="w-full md:w-96 lg:w-[28rem] bg-surface-lowest rounded-2xl shadow-soft flex flex-col max-h-full">
        {/* Order Header */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">Current Order</h2>
          
          {/* Order Type Selection - Responsive Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleOrderTypeChange('DINE_IN')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                orderType === 'DINE_IN'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Dine-in</span>
              <span className="sm:hidden">Dine</span>
            </button>
            <button
              onClick={() => setOrderType('TAKEAWAY')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                orderType === 'TAKEAWAY'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Takeaway</span>
              <span className="sm:hidden">Take</span>
            </button>
            <button
              onClick={() => setOrderType('DELIVERY')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                orderType === 'DELIVERY'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Delivery</span>
            </button>
            <button
              onClick={() => setOrderType('RESERVATION')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                orderType === 'RESERVATION'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Reservation</span>
              <span className="sm:hidden">Reserve</span>
            </button>
          </div>

          {/* Selected Table Info */}
          {orderType === 'DINE_IN' && selectedTableId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  Table: {tables?.find((t: any) => t.id === selectedTableId)?.number || selectedTableId}
                </span>
              </div>
              <button
                onClick={() => setSelectedTableId(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {currentOrder.items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 text-gray-400"
              >
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No items yet</p>
                <p className="text-sm">Tap menu items to add them</p>
              </motion.div>
            ) : (
              currentOrder.items.map((item) => (
                <OrderItemCard
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                  onAddNote={() => setShowItemNotes(item.id)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-semibold">$0.00</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              onClick={clearOrder}
              className="py-4 px-4 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="py-4 px-4 gradient-btn rounded-xl font-semibold shadow-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <PaymentModal
            total={total}
            onClose={() => setShowPaymentModal(false)}
            onPayment={handlePayment}
            isProcessing={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Item Notes Modal */}
      <AnimatePresence>
        {showItemNotes && (
          <ItemNotesModal
            itemId={showItemNotes}
            onClose={() => setShowItemNotes(null)}
          />
        )}
      </AnimatePresence>

      {/* Table Selection Modal */}
      <AnimatePresence>
        {showTableSelection && (
          <TableSelectionModal
            tables={tables || []}
            selectedTableId={selectedTableId}
            onSelect={handleTableSelect}
            onClose={() => setShowTableSelection(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Order Item Card Component
const OrderItemCard: React.FC<{
  item: OrderItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onAddNote: () => void;
}> = ({ item, onUpdateQuantity, onRemove, onAddNote }) => {
  const { formatCurrency } = useCurrencyFormatter();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-surface-container rounded-xl p-3"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{item.name}</h4>
          <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-surface-lowest rounded-lg p-1">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-bold">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-8 h-8 flex items-center justify-center bg-primary text-white hover:bg-primary-container rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right">
          <p className="font-bold text-primary">{formatCurrency(item.price * item.quantity)}</p>
          <button
            onClick={onAddNote}
            className="text-xs text-gray-500 hover:text-primary"
          >
            {item.notes ? '✓ Note added' : '+ Add note'}
          </button>
        </div>
      </div>

      {item.notes && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">📝 {item.notes}</p>
        </div>
      )}
    </motion.div>
  );
};

// Payment Modal Component
const PaymentModal: React.FC<{
  total: number;
  onClose: () => void;
  onPayment: (method: string) => void;
  isProcessing: boolean;
}> = ({ total, onClose, onPayment, isProcessing }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: Banknote, color: 'bg-green-500' },
    { id: 'card', name: 'Card', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'mobile', name: 'Mobile Wallet', icon: Smartphone, color: 'bg-purple-500' },
    { id: 'split', name: 'Split Bill', icon: SplitSquareHorizontal, color: 'bg-orange-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-surface-lowest rounded-3xl p-8 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Process Payment</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-2">Total Amount</p>
          <p className="text-5xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => onPayment(method.name)}
                disabled={isProcessing}
                className={`${method.color} text-white p-6 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50`}
              >
                <Icon className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">{method.name}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          disabled={isProcessing}
          className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
};

// Item Notes Modal
const ItemNotesModal: React.FC<{
  itemId: string;
  onClose: () => void;
}> = ({ itemId, onClose }) => {
  const [notes, setNotes] = useState('');
  const { updateNotes } = useOrderStore();

  const handleSave = () => {
    updateNotes(itemId, notes);
    toast.success('Note added');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-surface-lowest rounded-3xl p-6 max-w-lg w-full"
      >
        <h3 className="text-xl font-bold mb-4">Add Note</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., No onions, extra spicy, well done..."
          className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl resize-none focus:border-primary focus:outline-none"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 gradient-btn rounded-xl font-semibold"
          >
            Save Note
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Table Selection Modal
const TableSelectionModal: React.FC<{
  tables: any[];
  selectedTableId: string | null;
  onSelect: (tableId: string) => void;
  onClose: () => void;
}> = ({ tables, selectedTableId, onSelect, onClose }) => {
  const availableTables = tables.filter((t: any) => t.status === 'AVAILABLE');
  const occupiedTables = tables.filter((t: any) => t.status === 'OCCUPIED');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-surface-lowest rounded-3xl p-6 max-w-4xl w-full max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Select Table</h2>
            <p className="text-sm text-gray-600 mt-1">Choose a table for dine-in order</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Available Tables */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Tables</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
            {availableTables.map((table: any) => (
              <motion.button
                key={table.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(table.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedTableId === table.id
                    ? 'border-primary bg-primary/10'
                    : 'border-green-200 bg-green-50 hover:border-green-400'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="font-bold text-sm">{table.number}</p>
                <p className="text-xs text-gray-600">{table.capacity} seats</p>
              </motion.button>
            ))}
          </div>

          {/* Occupied Tables */}
          {occupiedTables.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Occupied Tables</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {occupiedTables.map((table: any) => (
                  <div
                    key={table.id}
                    className="p-4 rounded-xl border-2 border-red-200 bg-red-50 opacity-60 cursor-not-allowed"
                  >
                    <Users className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <p className="font-bold text-sm">{table.number}</p>
                    <p className="text-xs text-gray-600">{table.capacity} seats</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default POSScreen;
