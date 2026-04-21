import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MapPin, Clock, DollarSign, Phone, Mail,
  User, Navigation, Package, TrendingUp, Plus,
  Search, Filter, CheckCircle, MoreVertical, X,
  ShieldCheck, ArrowRight, Zap, ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { deliveryService } from '../services/deliveryService';
import { staffService } from '../services/staffService';
import { Badge, TableSkeleton } from '@poslytic/ui-components';
import toast from 'react-hot-toast';

const DeliveryManagementScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'riders' | 'zones'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');
  const { formatCurrency } = useCurrencyFormatter();

  const { data: deliveries, isLoading: isLoadingDel } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const response = await deliveryService.getDeliveries();
      return response.data.data.deliveries || [];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.users || [];
    },
  });

  const riders = staff?.filter((s: any) => s.role === 'RIDER') || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Truck className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Logistics Hub</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Monitor rider dispatch, optimize delivery routes, and track fulfillment latency</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Zap className="w-5 h-5" />
              Smart Dispatch
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Shipments', value: deliveries?.length || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Riders Online', value: riders.length, icon: User, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Time-to-Door', value: '24m', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Delivery Revenue', value: '$1,240', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
          { id: 'deliveries', label: 'Live Orders', icon: Navigation },
          { id: 'riders', label: 'Fleet Management', icon: Users },
          { id: 'zones', label: 'Service Zones', icon: MapPin },
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
         {activeTab === 'deliveries' && (
            <AnimatePresence mode="wait">
               {isLoadingDel ? (
                  <div className="p-8"><TableSkeleton /></div>
               ) : (
                  <table className="w-full text-left">
                     <thead className="bg-gray-50/50">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           <th className="px-10 py-6">Consignment #</th>
                           <th className="px-10 py-6">Destination</th>
                           <th className="px-10 py-6">Fulfillment Node</th>
                           <th className="px-10 py-6">Latency</th>
                           <th className="px-10 py-6">Operational Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                        {deliveries?.map((del: any) => (
                          <tr key={del.id} className="group hover:bg-gray-50/80 transition-colors">
                             <td className="px-10 py-6">
                                <p className="font-black text-gray-900">{del.deliveryNumber}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Order {del.orderId.substring(0,8)}</p>
                             </td>
                             <td className="px-10 py-6">
                                <p className="font-bold text-gray-700 text-sm truncate max-w-[200px]">{del.deliveryAddress}</p>
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{del.customerName}</p>
                             </td>
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><User className="w-4 h-4 text-gray-400" /></div>
                                   <p className="text-xs font-bold text-gray-600">{del.rider?.fullName || 'Unassigned'}</p>
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <div className="flex items-center gap-2 text-xs font-black text-gray-400 italic">
                                   <Clock className="w-3 h-3" /> {del.estimatedTime || 30}m
                                </div>
                             </td>
                             <td className="px-10 py-6">
                                <Badge variant={del.status === 'DELIVERED' ? 'success' : 'info'}>{del.status}</Badge>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </AnimatePresence>
         )}

         {activeTab === 'zones' && (
            <div className="p-20 text-center space-y-4">
               <MapPin className="w-16 h-16 text-gray-200 mx-auto" />
               <h3 className="text-xl font-black text-gray-400 uppercase">Geospatial Boundaries</h3>
               <p className="text-gray-400 font-medium italic max-w-sm mx-auto">Dynamic geofencing and zone-based pricing logic is being calculated for your region.</p>
               <button className="px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Define Zone</button>
            </div>
         )}
      </div>
    </div>
  );
};

export default DeliveryManagementScreen;
