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
  Check,
} from 'lucide-react';
import { useOrderStore, OrderItem } from '../stores/orderStore';
import toast from 'react-hot-toast';

// Mock menu data (will be replaced with API call)
const mockCategories = [
  { id: '1', name: 'Appetizers', icon: '🥗' },
  { id: '2', name: 'Main Course', icon: '🍖' },
  { id: '3', name: 'Desserts', icon: '🍰' },
  { id: '4', name: 'Beverages', icon: '☕' },
  { id: '5', name: 'Sides', icon: '🍟' },
];

const mockMenuItems = [
  { id: '1', categoryId: '1', name: 'Caesar Salad', price: 8.99, image: '🥗', description: 'Fresh romaine with parmesan' },
  { id: '2', categoryId: '1', name: 'Spring Rolls', price: 6.99, image: '🌯', description: 'Crispy vegetable rolls' },
  { id: '3', categoryId: '2', name: 'Grilled Steak', price: 24.99, image: '🥩', description: 'Premium beef steak' },
  { id: '4', categoryId: '2', name: 'Chicken Curry', price: 16.99, image: '🍛', description: 'Spicy chicken curry' },
  { id: '5', categoryId: '2', name: 'Pasta Carbonara', price: 14.99, image: '🍝', description: 'Creamy pasta with bacon' },
  { id: '6', categoryId: '3', name: 'Chocolate Cake', price: 7.99, image: '🍰', description: 'Rich chocolate layer cake' },
  { id: '7', categoryId: '3', name: 'Ice Cream', price: 5.99, image: '🍨', description: 'Vanilla bean ice cream' },
  { id: '8', categoryId: '4', name: 'Coffee', price: 3.99, image: '☕', description: 'Freshly brewed coffee' },
  { id: '9', categoryId: '4', name: 'Fresh Juice', price: 4.99, image: '🧃', description: 'Orange or apple juice' },
  { id: '10', categoryId: '5', name: 'French Fries', price: 4.99, image: '🍟', description: 'Crispy golden fries' },
];

const POSScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showItemNotes, setShowItemNotes] = useState<string | null>(null);

  const { currentOrder, addItem, removeItem, updateQuantity, clearOrder, getSubtotal, getTotal } = useOrderStore();

  const filteredItems = mockMenuItems.filter((item) => {
    const matchesCategory = item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory || matchesSearch;
  });

  const handleAddItem = (item: typeof mockMenuItems[0]) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
    toast.success(`Added ${item.name}`);
  };

  const handleCheckout = () => {
    if (currentOrder.items.length === 0) {
      toast.error('Please add items to the order');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = (method: string) => {
    toast.success(`Payment processed via ${method}`);
    setShowPaymentModal(false);
    clearOrder();
  };

  const subtotal = getSubtotal();
  const total = getTotal();

  return (
    <div className="h-full flex gap-6">
      {/* Left Panel - Menu */}
      <div className="flex-1 flex flex-col">
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
          {mockCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-medium'
                  : 'bg-surface-container text-gray-700 hover:bg-surface-container-lowest'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAddItem(item)}
                className="bg-surface-lowest rounded-2xl p-4 shadow-soft hover:shadow-medium transition-all text-left"
              >
                <div className="text-5xl mb-3">{item.image}</div>
                <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Current Order */}
      <div className="w-96 bg-surface-lowest rounded-2xl shadow-soft flex flex-col">
        {/* Order Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Current Order</h2>
          <div className="flex gap-2">
            <button className="flex-1 py-2 px-3 bg-primary/10 text-primary rounded-lg text-sm font-semibold">
              Dine-In
            </button>
            <button className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
              Takeaway
            </button>
            <button className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
              Delivery
            </button>
          </div>
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
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (0%)</span>
            <span className="font-semibold">$0.00</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
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
              className="py-4 px-4 gradient-btn rounded-xl font-semibold shadow-medium"
            >
              Checkout
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
          <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
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
          <p className="font-bold text-primary">${(item.price * item.quantity).toFixed(2)}</p>
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
}> = ({ total, onClose, onPayment }) => {
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
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-2">Total Amount</p>
          <p className="text-5xl font-bold text-primary">${total.toFixed(2)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => onPayment(method.name)}
                className={`${method.color} text-white p-6 rounded-2xl hover:opacity-90 transition-opacity`}
              >
                <Icon className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">{method.name}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-surface-lowest rounded-3xl p-6 max-w-lg w-full mx-4"
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

export default POSScreen;
