import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Tag, Plus, Search, Filter,
  ChevronRight, Edit, Trash2, Image as ImageIcon,
  MoreVertical, Star, Clock, AlertCircle, RefreshCw,
  LayoutGrid, List, Layers, Grid, Archive
} from 'lucide-react';
import { useMenuCategories, useMenuItems } from '../hooks/useMenu';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { Badge, TableSkeleton } from '@poslytic/ui-components';

const AdvancedMenuScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'modifiers' | 'combos'>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const { formatCurrency } = useCurrencyFormatter();

  const { data: categories, isLoading: isLoadingCat } = useMenuCategories();
  const { data: items, isLoading: isLoadingItems } = useMenuItems({
    search: searchQuery || undefined
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Layers className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Menu Architect</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Configure culinary offerings, digital catalog appearance, and modifier dependencies</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
              Design New Entry
           </button>
        </div>
      </header>

      <div className="flex gap-2 bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
        {[
          { id: 'items', label: 'Offerings', icon: LayoutGrid },
          { id: 'categories', label: 'Taxonomy', icon: Tag },
          { id: 'modifiers', label: 'Customizations', icon: Edit },
          { id: 'combos', label: 'Bundles', icon: Archive },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
               <input
                 type="text"
                 placeholder="Search product identifiers..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
               />
            </div>
            <div className="flex gap-3">
               <button className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"><Grid className="w-5 h-5" /></button>
               <button className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"><List className="w-5 h-5" /></button>
            </div>
         </div>

         <AnimatePresence mode="wait">
            <motion.div key={activeTab}>
               {isLoadingItems || isLoadingCat ? (
                  <div className="p-8"><TableSkeleton /></div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-10">
                     {items?.map((item: any, idx: number) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-soft hover:shadow-xl transition-all"
                        >
                           <div className="h-48 bg-gray-100 relative overflow-hidden">
                              {item.image ? (
                                 <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon className="w-12 h-12" />
                                 </div>
                              )}
                              <div className="absolute top-4 left-4">
                                 <Badge variant={item.isAvailable ? 'success' : 'error'}>{item.isAvailable ? 'Live' : 'Sold Out'}</Badge>
                              </div>
                           </div>
                           <div className="p-8">
                              <div className="flex justify-between items-start mb-2">
                                 <h4 className="text-xl font-black text-gray-900 tracking-tight">{item.name}</h4>
                                 <span className="font-black text-primary">{formatCurrency(item.price)}</span>
                              </div>
                              <p className="text-gray-400 text-xs font-medium italic mb-6 line-clamp-2">{item.description || 'No detailed description available for this catalog entry.'}</p>

                              <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                                 <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.prepTimeMinutes}m Prep</span>
                                 </div>
                                 <div className="flex gap-2">
                                    <button className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-all"><Edit className="w-4 h-4" /></button>
                                    <button className="p-3 bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                     ))}
                  </div>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export default AdvancedMenuScreen;
