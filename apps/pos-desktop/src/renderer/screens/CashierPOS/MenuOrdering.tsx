import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Trash2,
  Bell,
  UtensilsCrossed,
  Pizza,
  Coffee,
  Salad,
  Sandwich,
  IceCream,
  PauseCircle,
  CookingPot,
  CreditCard,
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../../hooks/useMenu';
import { useOrderStore } from '../../stores/orderStore';
import toast from 'react-hot-toast';

interface MenuOrderingProps {
  orderType: string;
  tableId?: string;
  customerName?: string;
  onBack: () => void;
  onSendToKitchen: () => void;
  onCheckout: () => void;
}

const categoryIcons: Record<string, any> = {
  Burgers: UtensilsCrossed,
  Pizza: Pizza,
  Pasta: UtensilsCrossed,
  Drinks: Coffee,
  Salads: Salad,
  Sandwiches: Sandwich,
  Desserts: IceCream,
  Default: UtensilsCrossed,
};

const MenuOrdering: React.FC<MenuOrderingProps> = ({
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

  const { currentOrder, addItem, removeItem, updateNotes, getSubtotal, getTotal } =
    useOrderStore();

  // Fetch data from API
  const { data: categories } = useMenuCategories();
  const { data: menuItems } = useMenuItems({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    available: true,
  });

  const filteredItems =
    menuItems?.filter((item: any) => {
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

  const handleSaveNote = (itemId: string) => {
    updateNotes(itemId, noteText);
    setShowItemNotes(null);
    setNoteText('');
    toast.success('Note added');
  };

  const subtotal = getSubtotal();
  const tax = subtotal * 0.085; // 8.5% tax
  const total = getTotal();

  const getCategoryIcon = (categoryName: string) => {
    return categoryIcons[categoryName] || categoryIcons.Default;
  };

  return (
    <div className="flex h-screen pt-20 pb-28 bg-gray-50">
      {/* Left Sidebar: Categories */}
      <nav className="bg-white h-full w-72 flex flex-col gap-2 pt-6 pb-6 border-r border-gray-200 shadow-sm">
        <div className="px-6 mb-4">
          <span className="font-manrope text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Menu Categories
          </span>
        </div>

        {/* Category Items */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          {categories?.map((category: any, index: number) => {
            const Icon = getCategoryIcon(category.name);
            const isActive = selectedCategory === category.id;

            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCategory(isActive ? '' : category.id)}
                className={`mx-4 flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" style={isActive ? { fill: 'currentColor' } : {}} />
                <span className="font-inter text-[13px] font-medium tracking-normal">
                  {category.name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Table Info Card */}
        {(tableId || customerName) && (
          <div className="mt-auto px-6">
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3 border border-gray-200">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {orderType === 'DINE_IN' ? `T${tableId}` : 'C'}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  {orderType === 'DINE_IN' ? `Table ${tableId}` : customerName || 'Customer'}
                </p>
                <p className="text-[10px] text-gray-500">Active Session</p>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <section className="flex-1 overflow-y-auto p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="font-manrope text-3xl font-extrabold text-gray-900 tracking-tight">
              {selectedCategory
                ? categories?.find((c: any) => c.id === selectedCategory)?.name
                : 'All Items'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">Select items to add to the current ticket.</p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 shadow-sm"
            />
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: any, index: number) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAddItem(item)}
                disabled={!item.isAvailable}
                className={`group relative flex flex-col bg-white hover:bg-gray-50 rounded-3xl overflow-hidden transition-all duration-300 active:scale-95 border border-gray-200 shadow-md ${
                  !item.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={item.image || 'https://via.placeholder.com/400x300?text=No+Image'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 text-left flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-manrope text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-primary font-manrope font-extrabold text-xl">
                      ${item.price.toFixed(2)}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Right Sidebar: Order Summary */}
      <aside className="w-96 bg-[#1c1b1b] flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-manrope text-xl font-extrabold text-[#e5e2e1]">Order Summary</h3>
            <span className="bg-[#353534] text-[#bdcabc] text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest">
              {currentOrder.items.length} Items
            </span>
          </div>

          {/* Order List */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-420px)] pr-2">
            <AnimatePresence>
              {currentOrder.items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-[#bdcabc]"
                >
                  <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No items yet</p>
                  <p className="text-sm">Tap menu items to add them</p>
                </motion.div>
              ) : (
                currentOrder.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-[#353534] p-4 rounded-2xl flex justify-between items-start"
                  >
                    <div className="flex gap-4 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-[#6ee591]/20 flex items-center justify-center text-[#6ee591] font-bold text-xs">
                        {item.quantity}x
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#e5e2e1]">{item.name}</p>
                        {item.notes && (
                          <p className="text-[10px] text-[#bdcabc] mt-1">{item.notes}</p>
                        )}
                        <button
                          onClick={() => setShowItemNotes(item.id)}
                          className="text-[10px] text-[#6ee591] mt-1 hover:underline"
                        >
                          {item.notes ? 'Edit note' : '+ Add note'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-manrope font-bold text-[#e5e2e1]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Order Totals */}
        <div className="mt-auto p-6 bg-[#0e0e0e] space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#bdcabc]">Subtotal</span>
              <span className="text-[#e5e2e1] font-manrope">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#bdcabc]">Tax (8.5%)</span>
              <span className="text-[#e5e2e1] font-manrope">${tax.toFixed(2)}</span>
            </div>
          </div>
          <div className="py-6 px-4 bg-[#353534] rounded-2xl flex justify-between items-center">
            <span className="font-manrope text-sm font-bold uppercase tracking-widest text-[#bdcabc]">
              Total Amount
            </span>
            <span className="font-manrope text-3xl font-black text-[#6ee591]">${total.toFixed(2)}</span>
          </div>
        </div>
      </aside>

      {/* Item Notes Modal */}
      <AnimatePresence>
        {showItemNotes && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#201f1f] rounded-3xl p-6 max-w-lg w-full"
            >
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-4">Add Note</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g., No onions, extra spicy, well done..."
                className="w-full h-32 p-4 bg-[#0e0e0e] border-none rounded-xl resize-none text-[#e5e2e1] focus:ring-2 focus:ring-[#6ee591] placeholder:text-zinc-700"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowItemNotes(null)}
                  className="flex-1 py-3 bg-[#2a2a2a] text-[#e5e2e1] rounded-xl font-semibold hover:bg-[#353534] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveNote(showItemNotes)}
                  className="flex-1 py-3 bg-gradient-to-br from-[#6ee591] to-[#50c878] text-[#00210c] rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 w-full z-[60] bg-[#131313]/90 backdrop-blur-2xl flex justify-between items-center px-8 py-6 h-28 border-t border-white/5 shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
        {/* Left: Quick Nav */}
        <div className="flex gap-4">
          <button className="flex flex-col items-center justify-center text-zinc-500 px-6 py-2 hover:text-[#6ee591] transition-all">
            <Bell className="w-6 h-6" />
            <span className="font-manrope text-[10px] font-bold uppercase tracking-widest mt-1">
              Orders
            </span>
          </button>
        </div>

        {/* Right: Primary Workflow Actions */}
        <div className="flex gap-4 flex-1 justify-end max-w-4xl">
          {/* Hold Order (Amber) */}
          <button className="flex-1 max-w-[240px] bg-[#ffbf00]/10 h-16 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all group overflow-hidden relative shadow-lg shadow-amber-950/20 hover:bg-[#ffbf00]/20">
            <PauseCircle className="w-6 h-6 text-[#ffe2ab]" />
            <span className="font-manrope font-black uppercase tracking-wider text-[#ffe2ab] text-sm">
              Hold Order
            </span>
          </button>

          {/* Send to Kitchen (Teal) */}
          <button
            onClick={onSendToKitchen}
            disabled={currentOrder.items.length === 0}
            className="flex-1 max-w-[240px] bg-[#03c7b8]/10 h-16 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all group overflow-hidden relative shadow-lg shadow-teal-950/20 hover:bg-[#03c7b8]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CookingPot className="w-6 h-6 text-[#45e3d3]" />
            <span className="font-manrope font-black uppercase tracking-wider text-[#45e3d3] text-sm">
              Send to Kitchen
            </span>
          </button>

          {/* Checkout (Emerald Green) */}
          <button
            onClick={onCheckout}
            disabled={currentOrder.items.length === 0}
            className="flex-[1.5] max-w-[320px] bg-gradient-to-br from-[#6ee591] to-[#50c878] h-16 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all group overflow-hidden relative shadow-xl shadow-emerald-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-6 h-6 text-[#00210c]" />
            <span className="font-manrope font-black uppercase tracking-widest text-[#00210c] text-base">
              Checkout
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default MenuOrdering;
