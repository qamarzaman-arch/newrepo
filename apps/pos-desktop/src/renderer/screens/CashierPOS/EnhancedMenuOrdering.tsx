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
import { Badge, Button } from '@poslytic/ui-components';
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
    toast.success(`${item.name} added`, { duration: 1000, position: 'bottom-right' });
  };

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden text-white">
      {/* LEFT: Category Sidebar */}
      <div className="w-24 bg-gray-900 border-r border-white/5 flex flex-col items-center py-8 gap-4">
         <button
           onClick={() => setSelectedCategory('')}
           className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${!selectedCategory ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:bg-white/5'}`}
         >
            <Layers className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase">All</span>
         </button>
         <div className="w-10 h-px bg-white/10 my-2" />
         {categories?.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${selectedCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:bg-white/5'}`}
            >
               <Tag className="w-5 h-5" />
               <span className="text-[8px] font-black uppercase truncate w-14 text-center">{cat.name}</span>
            </button>
         ))}
      </div>

      {/* MIDDLE: Item Grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
         <header className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <button onClick={onBack} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                  <ArrowLeft className="w-6 h-6 text-white/40" />
               </button>
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">Catalog <span className="text-primary">Explorer</span></h2>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Active Node: {orderType} {tableNumber && `/ Table #${tableNumber}`}</p>
               </div>
            </div>

            <div className="relative w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
               <input
                 type="text"
                 placeholder="Search identifiers..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold focus:bg-white/10 focus:border-primary/50 transition-all outline-none"
               />
            </div>
         </header>

         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {isLoadingItems ? (
               <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-48 bg-white/5 rounded-[2rem] animate-pulse" />)}
               </div>
            ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {menuItems?.map((item: any) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddItem(item)}
                      className="group relative flex flex-col text-left bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all"
                    >
                       <div className="h-32 bg-gray-900 relative">
                          {item.image && <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="" />}
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                             <span className="text-xs font-black text-primary">{formatCurrency(item.price)}</span>
                          </div>
                       </div>
                       <div className="p-6">
                          <h4 className="font-black text-sm uppercase tracking-tight mb-1 truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 text-[8px] font-bold text-white/30 uppercase tracking-widest">
                             <Clock className="w-3 h-3" />
                             {item.prepTimeMinutes} MIN PREP
                          </div>
                       </div>
                    </motion.button>
                  ))}
               </div>
            )}
         </div>
      </div>

      {/* RIGHT: Cart / Ticket */}
      <div className="w-[450px] bg-gray-900 border-l border-white/5 flex flex-col">
         <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div>
               <h3 className="text-xl font-black uppercase tracking-tighter italic">Live <span className="text-primary">Ticket</span></h3>
               <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">{currentOrder.items.length} Units Stacked</p>
            </div>
            <button onClick={() => useOrderStore.getState().clearOrder()} className="p-3 bg-red-950/30 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">
               <Trash2 className="w-5 h-5" />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <AnimatePresence mode="popLayout">
               {currentOrder.items.map((item) => (
                 <motion.div
                   key={item.menuItemId}
                   layout
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="p-5 bg-white/5 border border-white/5 rounded-3xl group hover:border-white/10 transition-all"
                 >
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex-1 min-w-0 mr-4">
                          <h5 className="font-black text-sm uppercase truncate">{item.name}</h5>
                          <p className="text-[10px] font-bold text-white/30 uppercase">{formatCurrency(item.price)} / unit</p>
                       </div>
                       <span className="font-black text-primary">{formatCurrency(item.price * item.quantity)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5">
                          <button onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all"><Minus className="w-4 h-4" /></button>
                          <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center bg-primary rounded-xl text-white shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /></button>
                       </div>

                       <div className="flex gap-2">
                          <button
                            onClick={() => setShowItemNotes(item.menuItemId)}
                            className={`p-3 rounded-xl transition-all ${item.notes ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/30 hover:text-white'}`}
                          >
                             <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeItem(item.menuItemId)} className="p-3 bg-white/5 text-white/30 hover:bg-red-600 hover:text-white rounded-xl transition-all">
                             <X className="w-4 h-4" />
                          </button>
                       </div>
                    </div>

                    {item.notes && (
                       <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                          <p className="text-[10px] font-bold text-primary uppercase italic">Note: {item.notes}</p>
                       </div>
                    )}
                 </motion.div>
               ))}
            </AnimatePresence>

            {currentOrder.items.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                  <UtensilsCrossed className="w-20 h-20 mb-4" />
                  <p className="font-black uppercase tracking-widest">Stack Empty</p>
               </div>
            )}
         </div>

         <div className="p-8 bg-gray-950 border-t border-white/5 space-y-6">
            <div className="space-y-3">
               <div className="flex justify-between text-white/40 font-bold uppercase text-[10px] tracking-widest">
                  <span>Subtotal Matrix</span>
                  <span>{formatCurrency(subtotal)}</span>
               </div>
               <div className="flex justify-between text-white/40 font-bold uppercase text-[10px] tracking-widest">
                  <span>Fiscal Duty ({settings.taxRate}%)</span>
                  <span>{formatCurrency(tax)}</span>
               </div>
               <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                  <div>
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Total Payload</p>
                     <h4 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(total)}</h4>
                  </div>
                  <div className="text-right">
                     <Badge variant="terminal" dot>Verified</Badge>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
               <button
                 onClick={onSendToKitchen}
                 disabled={currentOrder.items.length === 0}
                 className="flex-1 py-5 bg-white/5 border border-white/10 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
               >
                  <CookingPot className="w-4 h-4" />
                  Fulfill
               </button>
               <button
                 onClick={onCheckout}
                 disabled={currentOrder.items.length === 0}
                 className="flex-1 py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
               >
                  <CreditCard className="w-4 h-4" />
                  Liquidate
               </button>
            </div>
         </div>
      </div>

      {/* Item Notes Modal */}
      <Modal
        isOpen={!!showItemNotes}
        onClose={() => setShowItemNotes(null)}
        title="Operational Notes"
        subtitle="Special preparation requirements"
        variant="terminal"
        size="sm"
      >
         <div className="space-y-6">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter specific instructions (e.g. EXTRA SPICY, NO ALLERGENS)..."
              className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 font-bold text-white focus:bg-white/10 focus:border-primary/50 transition-all outline-none resize-none"
            />
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                 if (showItemNotes) updateNotes(showItemNotes, noteText);
                 setShowItemNotes(null);
                 setNoteText('');
              }}
            >
               Confirm Instruction
            </Button>
         </div>
      </Modal>
    </div>
  );
};

export default EnhancedMenuOrdering;
