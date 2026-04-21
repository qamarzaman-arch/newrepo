import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, Calendar, DollarSign, Plus,
  Search, Filter, ShieldCheck, Mail, Phone,
  ChevronRight, MoreVertical, Edit, Trash2,
  TrendingUp, Activity, Timer, UserCheck, UserX
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { staffService } from '../services/staffService';
import { Badge, TableSkeleton } from '@poslytic/ui-components';
import toast from 'react-hot-toast';

const StaffScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'shifts' | 'performance'>('roster');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.users || [];
    },
  });

  const filteredStaff = staff?.filter((member: any) =>
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Users className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Human Capital</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Manage employee credentials, monitor attendance, and analyze performance metrics</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
              Onboard Talent
           </button>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Workforce', value: staff?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active on Duty', value: 8, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Shift Time', value: '7.4h', icon: Timer, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Payroll (W)', value: '$24,500', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      <div className="flex gap-2 bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
        {[
          { id: 'roster', label: 'Employee Roster', icon: Users },
          { id: 'shifts', label: 'Shift Logs', icon: Clock },
          { id: 'performance', label: 'Talent Analytics', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white shadow-xl scale-105'
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
                 placeholder="Search personnel by name or role..."
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
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
               {isLoading ? (
                  <div className="p-8"><TableSkeleton /></div>
               ) : (
                  <table className="w-full text-left">
                     <thead className="bg-gray-50/50">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <th className="px-10 py-6">Employee Identity</th>
                           <th className="px-10 py-6">Access Role</th>
                           <th className="px-10 py-6">Status</th>
                           <th className="px-10 py-6">Performance</th>
                           <th className="px-10 py-6 text-right">Operations</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {filteredStaff?.map((member: any) => (
                          <tr key={member.id} className="group hover:bg-gray-50/80 transition-colors">
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                                      {member.fullName.charAt(0)}
                                   </div>
                                   <div>
                                      <p className="font-black text-gray-900">{member.fullName}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{member.email || 'No email'}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">{member.role}</span>
                             </td>
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-2">
                                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                   <span className="text-xs font-bold text-green-700">Active</span>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="flex-1 min-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-primary rounded-full" style={{ width: '85%' }} />
                                   </div>
                                   <span className="text-xs font-black text-gray-900">4.8</span>
                                </div>
                             </td>
                             <td className="px-10 py-6 text-right">
                                <div className="flex justify-end gap-2">
                                   <button className="p-2 text-gray-400 hover:text-primary transition-colors"><ShieldCheck className="w-5 h-5" /></button>
                                   <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><UserX className="w-5 h-5" /></button>
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

export default StaffScreen;
