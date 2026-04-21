import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table as TableIcon, Users, MapPin, Plus,
  Search, Filter, ChevronRight, Lock,
  CheckCircle, Timer, AlertCircle, RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tableService } from '../services/tableService';
import { Badge } from '@poslytic/ui-components';
import toast from 'react-hot-toast';

const TablesScreen: React.FC = () => {
  const [activeFloor, setActiveFloor] = useState<string>('Main Hall');
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const response = await tableService.getTables();
      return response.data.data.tables || [];
    },
  });

  const floors = ['Main Hall', 'Terrace', 'VIP Lounge', 'Bar Area'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'border-green-500 bg-green-50 text-green-700';
      case 'OCCUPIED': return 'border-red-500 bg-red-50 text-red-700';
      case 'RESERVED': return 'border-blue-500 bg-blue-50 text-blue-700';
      case 'NEEDS_CLEANING': return 'border-orange-500 bg-orange-50 text-orange-700';
      default: return 'border-gray-200 bg-gray-50 text-gray-500';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><TableIcon className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Table Intelligence</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Real-time floor monitoring, capacity optimization and reservation management</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
              Manage Layout
           </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm w-fit">
        {floors.map((floor) => (
          <button
            key={floor}
            onClick={() => setActiveFloor(floor)}
            className={`flex items-center gap-3 px-6 py-3 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all ${
              activeFloor === floor
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            {floor}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-48 bg-white rounded-[2.5rem] animate-pulse border border-gray-100" />
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {tables?.map((table: any, idx: number) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              className={`relative p-6 rounded-[2.5rem] border-4 transition-all hover:shadow-xl group cursor-pointer ${getStatusColor(table.status)}`}
            >
               <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl font-black tracking-tighter">#{table.number}</span>
                  <div className="flex items-center gap-1 opacity-60">
                     <Users className="w-3 h-3" />
                     <span className="text-[10px] font-black">{table.capacity}</span>
                  </div>
               </div>

               <div className="py-4 flex flex-col items-center justify-center gap-2">
                  {table.status === 'AVAILABLE' && <CheckCircle className="w-8 h-8" />}
                  {table.status === 'OCCUPIED' && <Timer className="w-8 h-8 animate-pulse" />}
                  {table.status === 'NEEDS_CLEANING' && <AlertCircle className="w-8 h-8" />}
                  {table.status === 'RESERVED' && <Lock className="w-8 h-8" />}

                  <span className="text-[10px] font-black uppercase tracking-widest mt-2">{table.status.replace('_', ' ')}</span>
               </div>

               {table.status === 'OCCUPIED' && table.orders?.[0] && (
                 <div className="mt-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-tight">Active Total</p>
                    <p className="text-sm font-black">$84.50</p>
                 </div>
               )}

               <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-[2rem]" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TablesScreen;
