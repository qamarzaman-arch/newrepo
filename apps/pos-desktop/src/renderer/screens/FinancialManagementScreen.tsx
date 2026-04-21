import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, PieChart,
  CreditCard, FileText, Calculator, Plus, Search,
  Filter, Download, ArrowUpRight, ArrowDownRight, Wallet,
  Activity, Landmark, Receipt, Globe, ShieldCheck
} from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { expenseService } from '../services/expenseService';
import { Badge, TableSkeleton } from '@poslytic/ui-components';

const FinancialManagementScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'taxes' | 'budget'>('overview');
  const { formatCurrency } = useCurrencyFormatter();

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const { data: expenseData, isLoading: isLoadingExp } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await expenseService.getExpenses();
      return response.data.data;
    },
  });

  const stats = [
    { label: 'Gross Yield', value: formatCurrency(dailySales?.totalRevenue || 0), trend: '+14%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Opex Ledger', value: formatCurrency(expenseData?.totalExpenses || 0), trend: '-2%', icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Fiscal Reserve', value: '$42,500', trend: 'Stable', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'EBITDA Margin', value: '32.4%', trend: '+4.2%', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Landmark className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Capital Management</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Comprehensive treasury oversight, tax compliance and operational expenditure audit</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Download className="w-5 h-5" />
              Fiscal Export
           </button>
        </div>
      </header>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
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
             <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{stat.trend}</span>
             </div>
             <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
        {[
          { id: 'overview', label: 'Treasury Overview', icon: Activity },
          { id: 'expenses', label: 'Expense Ledger', icon: Receipt },
          { id: 'taxes', label: 'Tax Compliance', icon: ShieldCheck },
          { id: 'budget', label: 'Allocations', icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-xl scale-105'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
         <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
               {activeTab === 'expenses' && (
                  <>
                     <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <div className="relative flex-1 max-w-md">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input type="text" placeholder="Audit voucher by ID or reference..." className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white transition-all outline-none" />
                        </div>
                        <button className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                           <Plus className="w-4 h-4" />
                           Add Voucher
                        </button>
                     </div>
                     {isLoadingExp ? <div className="p-8"><TableSkeleton /></div> : (
                        <table className="w-full text-left">
                           <thead className="bg-gray-50/50">
                              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                 <th className="px-10 py-6">Voucher Node</th>
                                 <th className="px-10 py-6">Category</th>
                                 <th className="px-10 py-6">Allocation</th>
                                 <th className="px-10 py-6">Fiscal Date</th>
                                 <th className="px-10 py-6 text-right">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {expenseData?.expenses?.map((exp: any) => (
                                <tr key={exp.id} className="group hover:bg-gray-50 transition-colors">
                                   <td className="px-10 py-6">
                                      <p className="font-black text-gray-900">{exp.id.substring(0,8).toUpperCase()}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[150px]">{exp.description}</p>
                                   </td>
                                   <td className="px-10 py-6">
                                      <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-600 uppercase tracking-widest">{exp.category}</span>
                                   </td>
                                   <td className="px-10 py-6">
                                      <p className="font-black text-red-600">({formatCurrency(exp.amount)})</p>
                                   </td>
                                   <td className="px-10 py-6 text-sm font-bold text-gray-500">
                                      {new Date(exp.createdAt).toLocaleDateString()}
                                   </td>
                                   <td className="px-10 py-6 text-right">
                                      <Badge variant="success">Authorized</Badge>
                                   </td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     )}
                  </>
               )}

               {activeTab === 'overview' && (
                  <div className="p-20 text-center space-y-6">
                     <PieChart className="w-20 h-20 text-primary/20 mx-auto" />
                     <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Treasury Visualization</h3>
                     <p className="text-gray-400 font-medium italic max-w-md mx-auto">Real-time capital flow analysis and department-wise burn rate forecasting is being generated based on your latest ledger entries.</p>
                     <div className="flex justify-center gap-4">
                        <div className="h-2 w-20 bg-primary rounded-full" />
                        <div className="h-2 w-12 bg-blue-600 rounded-full" />
                        <div className="h-2 w-8 bg-emerald-600 rounded-full" />
                     </div>
                  </div>
               )}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export default FinancialManagementScreen;
