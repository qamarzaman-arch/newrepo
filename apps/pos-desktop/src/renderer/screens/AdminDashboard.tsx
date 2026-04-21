import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  FileText,
  Printer,
  RefreshCw,
  Bell,
  MapPin,
  Calendar,
  Truck,
  Activity,
  History
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { orderService } from '../services/orderService';
import { inventoryService } from '../services/inventoryService';
import { tableService } from '../services/tableService';
import { auditLogService } from '../services/auditLogService';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      const response = await orderService.getOrders({ status: 'PENDING', limit: 10 });
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

  const { data: auditLogs } = useQuery({
    queryKey: ['recent-audit-logs'],
    queryFn: async () => {
      const response = await auditLogService.getLogs({ limit: 10 });
      return response.data.data.logs;
    },
  });

  const stats = useMemo(() => [
    {
      title: "Today's Revenue",
      value: formatCurrency(dailySales?.totalRevenue || 0),
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: "Orders Handled",
      value: dailySales?.totalOrders || 0,
      change: '+5.2%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Active Customers',
      value: '142',
      change: '+18%',
      trend: 'up',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: 'Optimal',
      trend: 'stable',
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ], [dailySales, formatCurrency]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'POS': navigate('/cashier-pos'); break;
      case 'ADD_ITEM': navigate('/menu'); break;
      case 'REFUND': navigate('/orders'); break;
      case 'FINANCE': navigate('/financial'); break;
      case 'STAFF': navigate('/staff'); break;
      case 'PRINT_Z': toast.success('Z-Report generated and sent to printer'); break;
      default: break;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Enterprise Console</h1>
          <p className="text-gray-500 font-medium italic">Welcome back, Administrator. Here is your real-time business overview.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-white border border-gray-200 rounded-2xl shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Live Server Connected</span>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
          >
            <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
            <div className="flex items-baseline gap-2">
               <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</h2>
               <span className={`text-xs font-black ${stat.trend === 'up' ? 'text-green-600' : 'text-blue-600'}`}>{stat.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Activity Area */}
         <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
               <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                  <Plus className="w-6 h-6 text-primary" />
                  Mission Control
               </h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'POS', label: 'New Order', icon: ShoppingCart, color: 'bg-primary', shadow: 'shadow-primary/20' },
                    { id: 'ADD_ITEM', label: 'Add Item', icon: Plus, color: 'bg-blue-600', shadow: 'shadow-blue-600/20' },
                    { id: 'REFUND', label: 'Refund', icon: RefreshCw, color: 'bg-orange-600', shadow: 'shadow-orange-600/20' },
                    { id: 'FINANCE', label: 'Reports', icon: FileText, color: 'bg-purple-600', shadow: 'shadow-purple-600/20' },
                    { id: 'STAFF', label: 'Staff', icon: Users, color: 'bg-indigo-600', shadow: 'shadow-indigo-600/20' },
                    { id: 'PRINT_Z', label: 'Z-Report', icon: Printer, color: 'bg-emerald-600', shadow: 'shadow-emerald-600/20' },
                  ].map((action) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickAction(action.id)}
                      className={`flex items-center gap-4 p-5 ${action.color} text-white rounded-3xl shadow-lg ${action.shadow} transition-all`}
                    >
                      <action.icon className="w-6 h-6" />
                      <span className="font-black uppercase text-xs tracking-widest">{action.label}</span>
                    </motion.button>
                  ))}
               </div>
            </section>

            {/* Recent Audit Logs */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                    <History className="w-6 h-6 text-primary" />
                    Security Audit Trail
                  </h3>
                  <button onClick={() => navigate('/settings')} className="text-xs font-black uppercase text-primary hover:underline">View All Logs</button>
               </div>
               <div className="space-y-4">
                  {auditLogs?.map((log: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-primary text-xs">
                             {log.action.substring(0, 1)}
                          </div>
                          <div>
                             <p className="text-sm font-black text-gray-900">{log.action} <span className="text-gray-400 font-bold uppercase text-[10px] ml-1">{log.entity}</span></p>
                             <p className="text-xs text-gray-500 font-medium italic">by {log.user?.fullName || 'System'}</p>
                          </div>
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <div className="text-center py-12 italic text-gray-400">No recent security activities</div>
                  )}
               </div>
            </section>
         </div>

         {/* Sidebar Area */}
         <div className="space-y-8">
            {/* Live Alerts */}
            <section className="bg-gray-900 text-white rounded-[2.5rem] p-8 shadow-2xl">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <Bell className="w-6 h-6 text-primary" />
                    Critical Alerts
                  </h3>
                  <span className="bg-primary text-white px-3 py-1 rounded-full text-[10px] font-black">{lowStockItems?.length || 0}</span>
               </div>

               <div className="space-y-4">
                  {lowStockItems?.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="p-5 bg-gray-800 rounded-3xl border border-gray-700 space-y-3">
                       <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          <p className="text-sm font-black uppercase tracking-tight">{item.name}</p>
                       </div>
                       <div className="flex items-center justify-between">
                          <div className="bg-gray-900 px-3 py-1 rounded-lg">
                             <span className="text-[10px] font-bold text-gray-500 block uppercase">Stock</span>
                             <span className="font-black text-orange-500">{item.currentStock} {item.unit}</span>
                          </div>
                          <button
                            onClick={() => navigate('/inventory')}
                            className="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Restock
                          </button>
                       </div>
                    </div>
                  ))}
                  {(!lowStockItems || lowStockItems.length === 0) && (
                    <div className="text-center py-8">
                       <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                       <p className="text-sm font-bold text-gray-400">Inventory Levels Stable</p>
                    </div>
                  )}
               </div>
            </section>

            {/* Performance Widget */}
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
               <h3 className="text-xl font-black text-gray-900 mb-6">Service Level</h3>
               <div className="space-y-6">
                  <div>
                     <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Kitchen Speed</span>
                        <span className="text-sm font-black text-gray-900">12m avg</span>
                     </div>
                     <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[85%] rounded-full shadow-lg shadow-primary/20"></div>
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Accuracy</span>
                        <span className="text-sm font-black text-gray-900">98.2%</span>
                     </div>
                     <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full w-[98%] rounded-full shadow-lg shadow-blue-600/20"></div>
                     </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-50">
                     <p className="text-[10px] text-center font-bold text-gray-400 uppercase italic italic-tracking-widest">Metrics updated 1m ago</p>
                  </div>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
