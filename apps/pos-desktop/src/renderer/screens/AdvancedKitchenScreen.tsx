import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, AlertCircle, CheckCircle, PlayCircle, 
  TrendingUp, BarChart3, ListFilter, Timer,
  Flame, Snowflake, Utensils, Filter, Bell,
  Zap, Volume2, ShieldAlert
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { kitchenService, KotTicket } from '../services/kitchenService';
import { Badge, Card, Button } from '@poslytic/ui-components';
import { useKitchenWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';

interface PrepListItem {
  id: string;
  item: string;
  station: string;
  quantity: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  completed: boolean;
}

const AdvancedKitchenScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'board' | 'analytics' | 'prep-list'>('board');
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [prepList, setPrepList] = useState<PrepListItem[]>([]);
  const [isRushMode, setIsRushMode] = useState(false);

  const { data: ticketsData = [], refetch, isRefetching } = useQuery({
    queryKey: ['kitchen-tickets'],
    queryFn: async () => {
      const response = await kitchenService.getActiveTickets();
      return response.data.data.tickets || [];
    },
    refetchInterval: 10000,
  });

  // Real-time updates via WebSocket
  const handleNewTicket = useCallback((ticket: any) => {
    // Play alert sound logic here if browser allows
    toast.success(`New order: ${ticket.ticketNumber}`, {
       icon: <Bell className="w-4 h-4 animate-bounce text-primary" />,
       duration: 5000
    });
    queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
  }, [queryClient]);

  const handleTicketUpdate = useCallback((_ticket: any) => {
    queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
  }, [queryClient]);

  useKitchenWebSocket(handleNewTicket, handleTicketUpdate);

  const handleStatusUpdate = async (ticketId: string, status: string) => {
    try {
      await kitchenService.updateStatus(ticketId, status as any);
      toast.success(`Ticket ${status}`);
      refetch();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const stations = ['ALL', 'GRILL', 'BAR', 'FRYER', 'SALAD', 'DESSERT'];

  // Enhanced filtering including station check on items
  const filteredTickets = ticketsData.filter((ticket: any) => {
    if (selectedStation === 'ALL') return true;
    // Check if any item in the order belongs to this station
    return ticket.order?.items?.some((item: any) => item.menuItem?.station === selectedStation);
  });

  const columns = [
    { id: 'NEW', title: 'New Intake', color: 'border-blue-500', icon: Zap },
    { id: 'IN_PROGRESS', title: 'In Production', color: 'border-yellow-500', icon: Flame },
    { id: 'READY', title: 'Quality Control', color: 'border-green-500', icon: CheckCircle },
  ];

  const getElapsedTime = (orderedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(orderedAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes}m`;
  };

  const isDelayed = (orderedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(orderedAt).getTime()) / 60000);
    return minutes > 15;
  };

  // Check for rush mode (more than 5 new orders)
  useEffect(() => {
    const newCount = ticketsData.filter((t: any) => t.status === 'NEW').length;
    setIsRushMode(newCount > 5);
  }, [ticketsData]);

  return (
    <div className={`h-full flex flex-col space-y-8 bg-gray-950 text-white p-8 overflow-hidden transition-colors duration-1000 ${isRushMode ? 'ring-inset ring-[20px] ring-red-900/10' : ''}`}>
      {/* KDS Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-gray-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
         {isRushMode && (
           <div className="absolute top-0 right-0 p-8 flex items-center gap-3 animate-pulse">
              <ShieldAlert className="text-red-500 w-6 h-6" />
              <span className="text-red-500 font-black uppercase text-xs tracking-widest">Rush Mode Active</span>
           </div>
         )}

         <div>
            <div className="flex items-center gap-4 mb-3">
               <div className="p-4 bg-primary/20 text-primary rounded-2xl border border-primary/20 shadow-xl shadow-primary/10">
                  <BarChart3 className="w-8 h-8" />
               </div>
               <div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase italic">Kitchen <span className="text-primary">Intelligence</span></h1>
                  <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-1 italic">Real-time Fulfillment Node / V4.2.0</p>
               </div>
            </div>
         </div>

         <div className="flex flex-wrap gap-4 bg-black/40 p-4 rounded-[2rem] border border-white/5">
            {stations.map(s => (
               <button
                 key={s}
                 onClick={() => setSelectedStation(s)}
                 className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                   selectedStation === s ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'
                 }`}
               >
                  {s}
               </button>
            ))}
         </div>
      </header>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-hidden">
         {columns.map((col) => {
            const colTickets = filteredTickets.filter((t: any) => t.status === col.id);
            return (
               <div key={col.id} className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6 px-4">
                     <div className="flex items-center gap-3">
                        <col.icon className={`w-5 h-5 ${col.id === 'NEW' ? 'text-blue-400' : col.id === 'IN_PROGRESS' ? 'text-yellow-400' : 'text-green-400'}`} />
                        <h3 className="text-xl font-black uppercase tracking-tight italic">{col.title}</h3>
                     </div>
                     <Badge variant="terminal" dot>{colTickets.length} active</Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                     <AnimatePresence mode="popLayout">
                        {colTickets.map((ticket: any) => {
                           const delayed = isDelayed(ticket.orderedAt);
                           return (
                              <motion.div
                                key={ticket.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-gray-900 border-l-8 ${delayed ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-white/5'} rounded-[2.5rem] p-8 space-y-6 transition-all duration-500 group hover:bg-gray-800/80`}
                              >
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <span className="text-3xl font-black tracking-tighter text-white">#{ticket.ticketNumber.slice(-3)}</span>
                                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">{ticket.order?.orderType} NODE</p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${delayed ? 'bg-red-950 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'}`}>
                                       <Clock className="w-3 h-3" />
                                       {getElapsedTime(ticket.orderedAt)}
                                    </div>
                                 </div>

                                 <div className="space-y-3 bg-black/40 p-6 rounded-3xl border border-white/5">
                                    {ticket.order?.items?.map((item: any) => {
                                       const matchesStation = selectedStation === 'ALL' || item.menuItem?.station === selectedStation;
                                       return (
                                          <div key={item.id} className={`flex justify-between items-center ${matchesStation ? 'opacity-100' : 'opacity-20'}`}>
                                             <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xs">{item.quantity}</span>
                                                <div>
                                                   <p className="font-black text-sm uppercase tracking-tight">{item.menuItem?.name}</p>
                                                   {item.notes && <p className="text-[10px] font-bold text-primary/60 italic mt-0.5">!! {item.notes}</p>}
                                                </div>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>

                                 <div className="flex gap-4">
                                    {ticket.status === 'NEW' && (
                                       <button
                                         onClick={() => handleStatusUpdate(ticket.id, 'IN_PROGRESS')}
                                         className="flex-1 py-4 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                       >
                                          Start Prep
                                       </button>
                                    )}
                                    {ticket.status === 'IN_PROGRESS' && (
                                       <button
                                         onClick={() => handleStatusUpdate(ticket.id, 'READY')}
                                         className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-green-600/20 hover:bg-green-500 transition-all"
                                       >
                                          Order Ready
                                       </button>
                                    )}
                                    {ticket.status === 'READY' && (
                                       <button
                                         onClick={() => handleStatusUpdate(ticket.id, 'COMPLETED')}
                                         className="flex-1 py-4 bg-gray-700 text-white/40 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-600 hover:text-white transition-all"
                                       >
                                          Bump Ticket
                                       </button>
                                    )}
                                 </div>
                              </motion.div>
                           );
                        })}
                     </AnimatePresence>
                     {colTickets.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center opacity-10 py-20 border-2 border-dashed border-white/20 rounded-[2.5rem]">
                           <Utensils className="w-12 h-12 mb-3" />
                           <p className="font-black uppercase tracking-widest text-xs">Section Clear</p>
                        </div>
                     )}
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
};

export default AdvancedKitchenScreen;
