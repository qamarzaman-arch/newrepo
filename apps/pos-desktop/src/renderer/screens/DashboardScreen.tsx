import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Users, AlertTriangle,
  Clock, Package, Truck, Calendar, MapPin,
  ChevronRight, ArrowUpRight, Activity, Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { orderService } from '../services/orderService';
import { inventoryService } from '../services/inventoryService';
import { tableService } from '../services/tableService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { Badge } from '@poslytic/ui-components';

const DashboardScreen: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const { data: monthlySales } = useQuery({
    queryKey: ['monthly-sales-7'],
    queryFn: async () => {
      const response = await reportService.getMonthlySales('7');
      return response.data.data;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      const response = await orderService.getOrders({ status: 'PENDING', limit: 5 });
      return response.data.data.orders;
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await inventoryService.getLowStock();
      return response.data.data.items;
    },
  });

  const stats = useMemo(() => [
    { title: "Daily Revenue", value: formatCurrency(dailySales?.totalRevenue || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: "Active Orders", value: pendingOrders?.length || 0, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: "Low Stock", value: lowStockItems?.length || 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: "Net Margin", value: '24.2%', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  ], [dailySales, pendingOrders, lowStockItems, formatCurrency]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-gray-900 tracking-tight">Executive Dashboard</h1>
           <p className="text-gray-500 font-medium italic italic-tracking-tight">Operational excellence through real-time intelligence</p>
        </div>
        <div className="flex gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm font-black uppercase text-[10px] tracking-widest px-4 py-2">
           <span className="text-gray-400">Live Status:</span>
           <span className="text-green-600">Operational</span>
        </div>
      </header>

      {/* Primary KPIs */}
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
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
             <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Sales Visualization */}
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Revenue Analytics</h3>
                  <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none">
                     <option>Last 7 Days</option>
                     <option>Last 30 Days</option>
                  </select>
               </div>
               <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlySales?.dailySales || []}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00513f" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#00513f" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 700}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 700}} />
                      <Tooltip
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#00513f" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Quick Activity Table */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Priority Transactions</h3>
                  <button className="text-[10px] font-black uppercase text-primary hover:underline">View Ledger</button>
               </div>
               <div className="divide-y divide-gray-50">
                  {pendingOrders?.map((order: any) => (
                    <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                             {order.orderNumber.substring(0, 2)}
                          </div>
                          <div>
                             <p className="text-sm font-black text-gray-900">{order.orderNumber}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.customerName || 'Anonymous'}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-gray-900 text-sm">{formatCurrency(order.totalAmount)}</p>
                          <Badge variant="info" size="sm">Active</Badge>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Alerts & Optimization */}
         <div className="space-y-8">
            <div className="bg-gray-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="text-xl font-black uppercase tracking-tight mb-8">Supply Disruptions</h3>
                  <div className="space-y-4">
                     {lowStockItems?.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                           <div className="flex items-center gap-3 mb-4">
                              <AlertTriangle className="w-5 h-5 text-orange-500" />
                              <p className="font-black text-sm uppercase">{item.name}</p>
                           </div>
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Status</p>
                                 <p className="text-lg font-black text-orange-500">{item.currentStock} {item.unit}</p>
                              </div>
                              <button className="bg-white text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Restock</button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[80px] rounded-full" />
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Service Velocity</h3>
               <div className="space-y-6">
                  {[
                    { label: 'Kitchen Turnaround', val: '84%', color: 'bg-primary' },
                    { label: 'Table Occupancy', val: '62%', color: 'bg-blue-600' },
                    { label: 'Customer Satisfaction', val: '98%', color: 'bg-emerald-600' },
                  ].map((m, i) => (
                    <div key={i}>
                       <div className="flex justify-between mb-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.label}</span>
                          <span className="text-xs font-black text-gray-900">{m.val}</span>
                       </div>
                       <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full`} style={{ width: m.val }} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
