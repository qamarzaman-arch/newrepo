import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, Bell, UtensilsCrossed, Info, X,
  CookingPot, CreditCard, Pause, Play, BarChart3, FileText, ArrowLeft,
  Tag, Clock, AlertTriangle, Layers, ChevronRight, Zap
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../../hooks/useMenu';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { getHardwareManager } from '../../services/hardwareManager';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import { Badge } from '@poslytic/ui-components';
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

  const { currentOrder, addItem, removeItem, updateQuantity, updateNotes, setOrderNotes, getSubtotal, getTax, getServiceCharge, getTotal } = useOrderStore();
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();

  const { data: categories } = useMenuCategories();
  const { data: menuItems, isLoading: isLoadingItems } = useMenuItems({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    available: true,
  });

  const subtotal = getSubtotal();
  const tax = getTax();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  const handleAddItem = (item: any) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
    toast.success(`${item.name} added`, { position: 'bottom-right' });
  };

  return (
    <div className="h-full flex bg-gray-50 overflow-hidden">
      {/* LEFT: Menu Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-100 p-8 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"><ArrowLeft className="w-6 h-6 text-gray-400" /></button>
              <div>
                 <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Product Catalog</h2>
                 <div className="flex items-center gap-3 mt-1">
                    <Badge variant="primary">{orderType}</Badge>
                    {tableNumber && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Table #{tableNumber}</span>}
                    {customerName && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">• Client: {customerName}</span>}
                 </div>
              </div>
           </div>

           <div className="relative w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search catalog index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
           </div>
        </header>

        {/* Categories Bar */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex gap-3 overflow-x-auto scrollbar-hide">
           <button
             onClick={() => setSelectedCategory('')}
             className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${!selectedCategory ? 'bg-gray-900 text-white shadow-xl' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
           >
              All Items
           </button>
           {categories?.map((cat: any) => (
             <button
               key={cat.id}
               onClick={() => setSelectedCategory(cat.id)}
               className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
             >
                {cat.name}
             </button>
           ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
           {isLoadingItems ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-48 bg-white rounded-[2rem] animate-pulse border border-gray-100" />)}
              </div>
           ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {menuItems?.map((item: any) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddItem(item)}
                      className="flex flex-col text-left bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
                    >
                       <div className="h-32 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                          {item.image ? (
                             <img src={item.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                          ) : (
                             <Layers className="w-10 h-10 text-gray-200" />
                          )}
                          <div className="absolute top-3 right-3">
                             <div className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary shadow-sm">
                                <Plus className="w-5 h-5" />
                             </div>
                          </div>
                       </div>
                       <div className="p-5 flex-1 flex flex-col">
                          <h4 className="font-black text-gray-900 text-sm leading-tight mb-2 line-clamp-2">{item.name}</h4>
                          <div className="mt-auto flex justify-between items-center">
                             <span className="font-black text-primary">{formatCurrency(item.price)}</span>
                             <span className="text-[10px] font-bold text-gray-400 uppercase">{item.prepTimeMinutes}m</span>
                          </div>
                       </div>
                    </motion.button>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* RIGHT: Active Order Sidebar */}
      <div className="w-[450px] bg-gray-900 text-white flex flex-col shadow-2xl z-20">
         <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
               <h3 className="text-xl font-black uppercase tracking-tight">Active Ledger</h3>
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{currentOrder.items.length} Units Staged</p>
            </div>
            <button onClick={() => useOrderStore.getState().clearOrder()} className="p-3 bg-red-950/30 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">
               <Trash2 className="w-5 h-5" />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
            {currentOrder.items.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-20">
                  <ShoppingCart className="w-16 h-16 mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">Cart is currently empty</p>
               </div>
            ) : (
               currentOrder.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl group"
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                           <p className="font-bold text-sm truncate">{item.name}</p>
                           <p className="text-xs text-white/40">{formatCurrency(item.price)}/ea</p>
                        </div>
                        <p className="font-black text-primary">{formatCurrency(item.price * item.quantity)}</p>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                           <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all"><Minus className="w-4 h-4" /></button>
                           <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { setShowItemNotes(item.id); setNoteText(item.notes || ''); }} className={`p-2 rounded-lg transition-all ${item.notes ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                              <FileText className="w-4 h-4" />
                           </button>
                           <button onClick={() => removeItem(item.id)} className="p-2 bg-red-950/30 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                              <X className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                     {item.notes && <p className="mt-3 text-[10px] text-yellow-500 italic font-medium">Note: {item.notes}</p>}
                  </motion.div>
               ))
            )}
         </div>

         {/* Ledger Summary */}
         <div className="p-8 bg-black/40 border-t border-white/5 space-y-6">
            <div className="space-y-2">
               <div className="flex justify-between text-xs font-bold text-white/40 uppercase tracking-widest">
                  <span>Gross Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
               </div>
               <div className="flex justify-between text-xs font-bold text-white/40 uppercase tracking-widest">
                  <span>Estimated Taxation</span>
                  <span>{formatCurrency(tax)}</span>
               </div>
               <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Total Value</span>
                  <span className="text-3xl font-black text-primary">{formatCurrency(total)}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button
                 onClick={onSendToKitchen}
                 disabled={currentOrder.items.length === 0}
                 className="flex flex-col items-center gap-2 p-5 bg-orange-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-600/20 hover:scale-105 transition-all disabled:opacity-50"
               >
                  <CookingPot className="w-6 h-6" />
                  Kitchen
               </button>
               <button
                 onClick={onCheckout}
                 disabled={currentOrder.items.length === 0}
                 className="flex flex-col items-center gap-2 p-5 bg-primary text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/40 hover:scale-105 transition-all disabled:opacity-50"
               >
                  <CreditCard className="w-6 h-6" />
                  Fulfill
               </button>
            </div>
         </div>
      </div>

      {/* NOTES MODAL */}
      <AnimatePresence>
        {showItemNotes && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-2xl">
               <h3 className="text-3xl font-black text-gray-900 mb-8 uppercase tracking-tight">Special Protocol</h3>
               <textarea
                 value={noteText}
                 onChange={(e) => setNoteText(e.target.value)}
                 className="w-full h-48 p-8 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-gray-900 focus:bg-white outline-none resize-none transition-all mb-8"
                 placeholder="Input special requests for this item..."
                 autoFocus
               />
               <div className="flex gap-4">
                  <button onClick={() => setShowItemNotes(null)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Abort</button>
                  <button onClick={() => { updateNotes(showItemNotes, noteText); setShowItemNotes(null); toast.success('Protocol added'); }} className="flex-1 py-5 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 transition-all">Register</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedMenuOrdering;
