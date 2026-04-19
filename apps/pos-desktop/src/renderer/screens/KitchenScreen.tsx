import React, { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { kitchenService } from '../services/kitchenService';
import { Clock, Wifi, WifiOff, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKitchenWebSocket } from '../hooks/useWebSocket';

const KitchenScreen: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: ticketsData, refetch } = useQuery({
    queryKey: ['kitchen-tickets'],
    queryFn: async () => {
      const response = await kitchenService.getActiveTickets();
      return response.data.data.tickets;
    },
    refetchInterval: 30000, // Fallback: Refetch every 30 seconds
  });

  // Real-time updates via WebSocket
  const handleNewTicket = useCallback((ticket: any) => {
    toast.success(`New order: ${ticket.ticketNumber}`, { icon: <Bell className="w-4 h-4" /> });
    queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
  }, [queryClient]);

  const handleTicketUpdate = useCallback((_ticket: any) => {
    queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
  }, [queryClient]);

  const { isConnected } = useKitchenWebSocket(handleNewTicket, handleTicketUpdate);

  const handleStatusUpdate = async (ticketId: string, status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED') => {
    try {
      await kitchenService.updateStatus(ticketId, status);
      toast.success(`Ticket marked as ${status}`);
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const columns = [
    { id: 'NEW', title: 'New Orders', color: 'border-blue-500' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-yellow-500' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-green-500' },
  ];

  const getElapsedTime = (orderedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(orderedAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes}m ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Kitchen Display</h1>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isConnected ? 'Real-time' : 'Polling'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTickets = ticketsData?.filter((t: any) => t.status === column.id) || [];

          return (
            <div key={column.id} className={`bg-surface-lowest rounded-2xl shadow-soft border-t-4 ${column.color}`}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{column.title}</h2>
                <p className="text-sm text-gray-600">{columnTickets.length} tickets</p>
              </div>

              <div className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                {columnTickets.map((ticket: any) => (
                  <div key={ticket.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">{ticket.ticketNumber}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getElapsedTime(ticket.orderedAt)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      {ticket.order?.items?.map((item: any) => (
                        <div key={item.id} className="text-sm">
                          <span className="font-semibold">{item.quantity}x</span> {item.menuItem?.name}
                          {item.notes && (
                            <p className="text-xs text-yellow-700 mt-1">📝 {item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {ticket.status === 'NEW' && (
                        <button
                          onClick={() => handleStatusUpdate(ticket.id, 'IN_PROGRESS')}
                          className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600"
                        >
                          Start
                        </button>
                      )}
                      {ticket.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleStatusUpdate(ticket.id, 'COMPLETED')}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {columnTickets.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No tickets</p>
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

export default KitchenScreen;
