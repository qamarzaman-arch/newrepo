import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Mail, Phone, MapPin, Plus,
  Search, Filter, Star, History, CreditCard,
  ChevronRight, MoreVertical, Edit, Trash2,
  TrendingUp, Award, Heart, MessageSquare
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '../services/customerService';
import { Badge, TableSkeleton } from '@poslytic/ui-components';

const CustomersScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await customerService.getCustomers();
      return response.data.data.customers || [];
    },
  });

  const filteredCustomers = customers?.filter((c: any) =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Users className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Customer CRM</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Track loyalty points, manage membership levels, and view comprehensive purchase history</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
              Register Profile
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Members', value: customers?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Elite Members', value: 12, icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Avg LTV', value: '$840', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'CSAT Score', value: '4.9/5', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
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
             <h3 className="text-3xl font-black text-gray-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
               <input
                 type="text"
                 placeholder="Search by name, phone or email..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
               />
            </div>
            <div className="flex gap-3">
               <button className="p-4 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"><Filter className="w-5 h-5" /></button>
            </div>
         </div>

         <AnimatePresence mode="wait">
            <motion.div key="list">
               {isLoading ? (
                  <div className="p-8"><TableSkeleton /></div>
               ) : (
                  <table className="w-full text-left">
                     <thead className="bg-gray-50/50">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <th className="px-10 py-6">Customer Persona</th>
                           <th className="px-10 py-6">Loyalty Tier</th>
                           <th className="px-10 py-6">Balance</th>
                           <th className="px-10 py-6">LTV</th>
                           <th className="px-10 py-6 text-right">Engagement</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {filteredCustomers?.map((customer: any) => (
                          <tr key={customer.id} className="group hover:bg-gray-50/80 transition-colors">
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-black text-lg">
                                      {customer.fullName.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="font-black text-gray-900">{customer.fullName}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{customer.phone || 'No phone'}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <Badge variant={customer.loyaltyPoints > 1000 ? 'warning' : 'primary'}>
                                   {customer.loyaltyPoints > 1000 ? 'Gold Elite' : 'Base Member'}
                                </Badge>
                             </td>
                             <td className="px-10 py-6">
                                <p className="font-black text-primary">{customer.loyaltyPoints} pts</p>
                             </td>
                             <td className="px-10 py-6">
                                <p className="font-black text-gray-900">${(customer.totalSpent || 0).toFixed(2)}</p>
                             </td>
                             <td className="px-10 py-6 text-right">
                                <div className="flex justify-end gap-2">
                                   <button className="p-2 text-gray-400 hover:text-primary transition-colors"><MessageSquare className="w-5 h-5" /></button>
                                   <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit className="w-5 h-5" /></button>
                                </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomersScreen;
