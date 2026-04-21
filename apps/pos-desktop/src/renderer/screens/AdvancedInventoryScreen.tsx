import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, ShoppingCart, BookOpen, Users, Plus, 
  Search, Filter, AlertTriangle, TrendingDown, 
  DollarSign, Clock, CheckCircle, Upload,
  Edit, Trash2, Eye, MoreVertical, FileText, ChevronRight,
  TrendingUp, ArrowDownRight, Warehouse, RotateCcw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { Badge } from '@poslytic/ui-components';
import toast from 'react-hot-toast';

const AdvancedInventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchase-orders' | 'recipes' | 'vendors'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();

  const { data: items, isLoading: isLoadingInv } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await inventoryService.getInventory();
      return response.data.data.items || [];
    },
  });

  const { data: purchaseOrders, isLoading: isLoadingPO } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await inventoryService.getPurchaseOrders();
      return response.data.data.orders || [];
    },
  });

  const { data: recipes, isLoading: isLoadingRecipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await inventoryService.getRecipes();
      return response.data.data.recipes || [];
    },
  });

  const filteredItems = items?.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalItems: items?.length || 0,
    lowStock: items?.filter((i: any) => i.currentStock <= i.minStock).length || 0,
    totalValue: items?.reduce((sum: number, i: any) => sum + (i.currentStock * i.costPerUnit), 0) || 0,
    activePO: purchaseOrders?.filter((po: any) => po.status === 'PENDING').length || 0
  };

  const getStatusBadge = (item: any) => {
    if (item.currentStock <= 0) return <Badge variant="error">Out of Stock</Badge>;
    if (item.currentStock <= item.minStock) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Package className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Supply Chain</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Monitor stock levels, manage recipes, and streamline vendor procurement</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
              New Supply Order
           </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Asset Value', value: formatCurrency(stats.totalValue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'SKU Count', value: stats.totalItems, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Critical Items', value: stats.lowStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending POs', value: stats.activePO, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group hover:shadow-xl transition-all"
          >
             <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
             <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
        {[
          { id: 'inventory', label: 'Warehouse', icon: Warehouse },
          { id: 'purchase-orders', label: 'Procurement', icon: ShoppingCart },
          { id: 'recipes', label: 'Master Recipes', icon: BookOpen },
          { id: 'vendors', label: 'Global Vendors', icon: Users },
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
                 placeholder="Search assets by name or SKU..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
               />
            </div>
            <div className="flex gap-3">
               <button className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"><Filter className="w-5 h-5" /></button>
               <button className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"><Upload className="w-5 h-5" /></button>
            </div>
         </div>

         <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
               {activeTab === 'inventory' && (
                  <table className="w-full text-left">
                     <thead className="bg-gray-50/50">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <th className="px-8 py-5">Inventory Asset</th>
                           <th className="px-8 py-5">Category</th>
                           <th className="px-8 py-5">Stock Level</th>
                           <th className="px-8 py-5">Unit Cost</th>
                           <th className="px-8 py-5">Status</th>
                           <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {filteredItems?.map((item: any) => (
                          <tr key={item.id} className="group hover:bg-gray-50/80 transition-colors">
                             <td className="px-8 py-5">
                                <p className="font-black text-gray-900">{item.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.sku || 'NO-SKU'}</p>
                             </td>
                             <td className="px-8 py-5">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.category || 'General'}</span>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${item.currentStock <= item.minStock ? 'bg-red-500' : 'bg-primary'}`}
                                        style={{ width: `${Math.min(100, (item.currentStock / (item.maxStock || 100)) * 100)}%` }}
                                      />
                                   </div>
                                   <span className="font-black text-gray-900">{item.currentStock} {item.unit}</span>
                                </div>
                             </td>
                             <td className="px-8 py-5 font-bold text-gray-600">{formatCurrency(item.costPerUnit)}</td>
                             <td className="px-8 py-5">{getStatusBadge(item)}</td>
                             <td className="px-8 py-5 text-right">
                                <div className="flex justify-end gap-2">
                                   <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                                   <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               )}

               {activeTab === 'recipes' && (
                  <div className="p-12 text-center space-y-4">
                     <BookOpen className="w-16 h-16 text-gray-200 mx-auto" />
                     <h3 className="text-xl font-black text-gray-400 uppercase">Recipe Intelligence</h3>
                     <p className="text-gray-400 font-medium italic max-w-sm mx-auto">Complex ingredient mapping and cost-per-dish analysis is currently synchronizing with the central database.</p>
                     <button className="px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Create Master Recipe</button>
                  </div>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export default AdvancedInventoryScreen;
