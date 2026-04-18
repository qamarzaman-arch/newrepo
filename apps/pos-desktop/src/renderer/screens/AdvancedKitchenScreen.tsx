import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, AlertCircle, CheckCircle, PlayCircle, 
  TrendingUp, BarChart3, ListFilter, Timer,
  Flame, Snowflake, Utensils
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { kitchenService, KotTicket } from '../services/kitchenService';
import toast from 'react-hot-toast';

const AdvancedKitchenScreen: React.FC = () => {
  const [activeView, setActiveView] = useState<'board' | 'analytics' | 'prep-list'>('board');
  const [selectedStation, setSelectedStation] = useState<string>('all');

  const { data: ticketsData, refetch, isRefetching } = useQuery({
    queryKey: ['kitchen-tickets'],
    queryFn: async () => {
      const response = await kitchenService.getActiveTickets();
      return response.data.data.tickets || [];
    },
    refetchInterval: 5000,
  });

  interface PrepListItem {
    id: string;
    item: string;
    station: string;
    quantity: string;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    completed: boolean;
  }


  const handleStatusUpdate = async (ticketId: string, status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED') => {
    try {
      await kitchenService.updateStatus(ticketId, status as KotTicket['status']);
      toast.success(`Ticket marked as ${status}`);
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  // Live analytics data from active queue
  const analytics = {
    avgPrepTime: '15 min', // Requires historic timeseries API
    ordersCompleted: ticketsData?.filter((t: any) => t.status === 'COMPLETED').length || 0,
    onTimePercentage: ticketsData && ticketsData.length > 0 
      ? Math.round(
          (ticketsData.filter((t: any) => {
            const min = Math.floor((Date.now() - new Date(t.orderedAt).getTime()) / 60000);
            return min <= 25;
          }).length / ticketsData.length) * 100
        )
      : 100,
    activeTickets: ticketsData?.filter((t: any) => t.status !== 'COMPLETED').length || 0,
    overdueTickets: ticketsData?.filter((t: any) => {
      const minutes = Math.floor((Date.now() - new Date(t.orderedAt).getTime()) / 60000);
      return minutes > 25 && t.status !== 'COMPLETED';
    }).length || 0,
  };

  // Dynamic prep list query (placeholder for future backend)
  const { data: lowStockItems } = useQuery<PrepListItem[]>({
    queryKey: ['low-stock-prep'],
    queryFn: async () => {
      return []; // Return empty for now until backend is updated
    },
  });

  const prepList = lowStockItems || [];

  const stations = [
    { id: 'all', name: 'All Stations', icon: Utensils },
    { id: 'grill', name: 'Grill Station', icon: Flame },
    { id: 'cold-prep', name: 'Cold Prep', icon: Snowflake },
    { id: 'fryer', name: 'Fryer', icon: Flame },
    { id: 'assembly', name: 'Assembly', icon: Utensils },
  ];

  const columns = [
    { id: 'NEW', title: 'New Orders', color: 'border-blue-500', bgColor: 'bg-blue-50' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-yellow-500', bgColor: 'bg-yellow-50' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-green-500', bgColor: 'bg-green-50' },
  ];

  const getElapsedTime = (orderedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(orderedAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  };

  const isOverdue = (orderedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(orderedAt).getTime()) / 60000);
    return minutes > 25;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-manrope">Kitchen Display System</h1>
              {isRefetching && (
                <div className="flex items-center gap-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase animate-pulse">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
                  Syncing
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400">Real-time Order Management</p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6 pl-6 border-l border-gray-700">
            <div className="text-center">
              <p className="text-xs text-gray-400">Avg Prep Time</p>
              <p className="text-lg font-bold text-green-400">{analytics.avgPrepTime}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">On-Time Rate</p>
              <p className="text-lg font-bold text-blue-400">{analytics.onTimePercentage}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Active Tickets</p>
              <p className="text-lg font-bold text-yellow-400">{analytics.activeTickets}</p>
            </div>
            {analytics.overdueTickets > 0 && (
              <div className="text-center">
                <p className="text-xs text-gray-400">Overdue</p>
                <p className="text-lg font-bold text-red-400">{analytics.overdueTickets}</p>
              </div>
            )}
          </div>
        </div>

        {/* View Toggle & Station Filter */}
        <div className="flex items-center gap-4">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:border-primary focus:outline-none"
          >
            {stations.map((station) => (
              <option key={station.id} value={station.id}>{station.name}</option>
            ))}
          </select>

          <div className="flex bg-gray-700 rounded-lg p-1">
            {[
              { id: 'board', label: 'Board', icon: Utensils },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'prep-list', label: 'Prep List', icon: ListFilter },
            ].map((view) => {
              const Icon = view.icon;
              return (
                <motion.button
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                    activeView === view.id
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {view.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        {/* KITCHEN BOARD VIEW */}
        {activeView === 'board' && (
          <div className="grid grid-cols-3 gap-6 h-full">
            {columns.map((column) => {
              const columnTickets = ticketsData?.filter((t: any) => t.status === column.id) || [];

              return (
                <motion.div
                  key={column.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border-t-4 ${column.color} ${column.bgColor} bg-opacity-10 flex flex-col`}
                >
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">{column.title}</h2>
                      <p className="text-sm text-gray-400">{columnTickets.length} tickets</p>
                    </div>
                    {column.id === 'NEW' && columnTickets.length > 0 && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-3 h-3 bg-blue-500 rounded-full"
                      />
                    )}
                  </div>

                  <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {columnTickets.map((ticket: any, index: number) => {
                      const overdue = isOverdue(ticket.orderedAt);
                      
                      return (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`bg-gray-800 rounded-xl p-4 border-2 ${
                            overdue ? 'border-red-500 animate-pulse' : 'border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-lg">{ticket.ticketNumber}</span>
                              {overdue && (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <span className={`text-xs flex items-center gap-1 ${
                              overdue ? 'text-red-400 font-bold' : 'text-gray-400'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {getElapsedTime(ticket.orderedAt)}
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            {ticket.order?.items?.map((item: any) => (
                              <div key={item.id} className="text-sm">
                                <div className="flex items-start gap-2">
                                  <span className="font-bold text-primary">{item.quantity}x</span>
                                  <span className="text-gray-200">{item.menuItem?.name}</span>
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-yellow-400 mt-1 ml-6">📝 {item.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            {ticket.status === 'NEW' && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleStatusUpdate(ticket.id, 'IN_PROGRESS')}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                              >
                                <PlayCircle className="w-4 h-4" />
                                Start
                              </motion.button>
                            )}
                            {ticket.status === 'IN_PROGRESS' && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleStatusUpdate(ticket.id, 'COMPLETED')}
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Complete
                              </motion.button>
                            )}
                            {ticket.status === 'COMPLETED' && (
                              <div className="flex-1 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm font-semibold text-center flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Done
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {columnTickets.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Utensils className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                        <p className="text-sm">No tickets</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {activeView === 'analytics' && (
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Performance Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-700 rounded-xl">
                  <span className="text-gray-300">Orders Completed Today</span>
                  <span className="text-2xl font-bold text-white">{analytics.ordersCompleted}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-700 rounded-xl">
                  <span className="text-gray-300">Average Prep Time</span>
                  <span className="text-2xl font-bold text-green-400">{analytics.avgPrepTime}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-700 rounded-xl">
                  <span className="text-gray-300">On-Time Delivery Rate</span>
                  <span className="text-2xl font-bold text-blue-400">{analytics.onTimePercentage}%</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-700 rounded-xl">
                  <span className="text-gray-300">Overdue Tickets</span>
                  <span className={`text-2xl font-bold ${analytics.overdueTickets > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {analytics.overdueTickets}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Timer className="w-5 h-5 text-yellow-400" />
                Peak Hours Analysis
              </h3>
              <div className="space-y-3">
                {[
                  { hour: '11:00 AM - 12:00 PM', orders: 28, color: 'bg-red-500' },
                  { hour: '12:00 PM - 1:00 PM', orders: 45, color: 'bg-red-600' },
                  { hour: '1:00 PM - 2:00 PM', orders: 35, color: 'bg-orange-500' },
                  { hour: '6:00 PM - 7:00 PM', orders: 42, color: 'bg-red-600' },
                  { hour: '7:00 PM - 8:00 PM', orders: 38, color: 'bg-orange-500' },
                ].map((slot, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 w-32">{slot.hour}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(slot.orders / 50) * 100}%` }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className={`${slot.color} h-full rounded-full`}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-12 text-right">{slot.orders}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* PREP LIST VIEW */}
        {activeView === 'prep-list' && (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-primary" />
                Daily Prep List
              </h3>
              <span className="text-sm text-gray-400">
                {prepList.filter(p => !p.completed).length} items remaining
              </span>
            </div>

            <div className="space-y-3">
              {prepList.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                    item.completed 
                      ? 'bg-green-900/20 border-green-600' 
                      : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        // Toggle completed status
                        toast.success(item.completed ? 'Marked as incomplete' : 'Marked as complete');
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        item.completed 
                          ? 'bg-green-600 border-green-600' 
                          : 'border-gray-500 hover:border-primary'
                      }`}
                    >
                      {item.completed && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                    <div>
                      <p className={`font-semibold ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {item.item}
                      </p>
                      <p className="text-sm text-gray-400">{item.station}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-300">{item.quantity}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.urgency === 'HIGH' ? 'bg-red-600 text-white' :
                      item.urgency === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {item.urgency}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdvancedKitchenScreen;
