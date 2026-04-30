'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, RefreshCw, AlertTriangle, Clock, CheckCircle, Flame, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

const TICKET_STATUS_STYLES: Record<string, string> = {
  NEW:         'border-yellow-400 bg-yellow-50',
  IN_PROGRESS: 'border-orange-400 bg-orange-50',
  COMPLETED:   'border-green-400 bg-green-50',
  DELAYED:     'border-red-400 bg-red-50',
};

const COLUMNS = ['NEW', 'IN_PROGRESS', 'COMPLETED'] as const;
const COLUMN_LABELS: Record<string, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Done',
};

interface KitchenTicket {
  id: string;
  ticketNumber: string;
  orderId: string;
  status: string;
  priority: string;
  station: string;
  orderedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  order?: {
    orderNumber: string;
    orderType: string;
    items?: { menuItem?: { name: string; category?: { name: string } }; quantity: number; notes?: string }[];
  };
}

function elapsedMinutes(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}

export default function KitchenPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState('all');
  const [activeView, setActiveView] = useState<'board' | 'analytics'>('board');

  const fetchTickets = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/kitchen/tickets/active');
      setTickets(res.data?.data?.tickets || []);
    } catch {
      setError('Failed to load kitchen tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const updateTicketStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await apiClient.patch(`/kitchen/tickets/${id}/status`, { status });
      await fetchTickets();
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setUpdatingId(null);
    }
  };

  const stations = ['all', ...Array.from(new Set(tickets.map(t => t.station).filter(Boolean)))];

  const filteredTickets = selectedStation === 'all'
    ? tickets
    : tickets.filter(t => t.station === selectedStation);

  const avgPrepTime = (() => {
    const done = tickets.filter(t => t.status === 'COMPLETED' && t.startedAt && t.completedAt);
    if (!done.length) return 0;
    return Math.round(done.reduce((s, t) => s + (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()), 0) / done.length / 60000);
  })();

  const overdueCount = tickets.filter(t => t.status !== 'COMPLETED' && elapsedMinutes(t.orderedAt) > 25).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <ChefHat className="text-red-600" /> Kitchen Display
          </h1>
          <p className="text-gray-500 mt-1">Live ticket board — auto-refreshes every 15 s</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['board', 'analytics'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors capitalize ${activeView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={fetchTickets} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Tickets', value: tickets.filter(t => t.status !== 'COMPLETED').length, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Overdue (>25 min)', value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? 'text-red-600' : 'text-gray-600', bg: overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50' },
            { label: 'Avg Prep Time', value: `${avgPrepTime} min`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Completed Today', value: tickets.filter(t => t.status === 'COMPLETED').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color} mb-3`}>
                <s.icon size={20} />
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Station Filter */}
      {activeView === 'board' && (
        <div className="flex items-center gap-2 flex-wrap">
          {stations.map(s => (
            <button key={s} onClick={() => setSelectedStation(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors capitalize ${selectedStation === s ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? 'All Stations' : s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeView === 'board' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {COLUMNS.map(col => {
            const colTickets = filteredTickets.filter(t => t.status === col);
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-gray-700 uppercase tracking-wider text-sm">{COLUMN_LABELS[col]}</h2>
                  <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{colTickets.length}</span>
                </div>
                {colTickets.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                    No tickets
                  </div>
                ) : (
                  colTickets.map(ticket => {
                    const elapsed = elapsedMinutes(ticket.orderedAt);
                    const isOverdue = elapsed > 25 && ticket.status !== 'COMPLETED';
                    return (
                      <div key={ticket.id} className={`rounded-2xl border-2 p-4 space-y-3 ${TICKET_STATUS_STYLES[ticket.status] || 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-gray-900">#{ticket.order?.orderNumber || ticket.ticketNumber}</span>
                          <span className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                            <Clock size={12} /> {elapsed}m
                          </span>
                        </div>
                        {ticket.station && (
                          <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full font-bold text-gray-600 capitalize">{ticket.station}</span>
                        )}
                        {ticket.order?.items && (
                          <div className="space-y-1">
                            {ticket.order.items.map((item, i) => (
                              <div key={i} className="text-sm text-gray-700">
                                <span className="font-bold">{item.quantity}×</span> {item.menuItem?.name || 'Item'}
                                {item.notes && <div className="text-xs text-gray-400 ml-4">{item.notes}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {ticket.notes && <p className="text-xs text-gray-500 italic">{ticket.notes}</p>}
                        <div className="flex gap-2 pt-1">
                          {ticket.status === 'NEW' && (
                            <button onClick={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')} disabled={updatingId === ticket.id}
                              className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
                              {updatingId === ticket.id ? '…' : 'Start'}
                            </button>
                          )}
                          {ticket.status === 'IN_PROGRESS' && (
                            <button onClick={() => updateTicketStatus(ticket.id, 'COMPLETED')} disabled={updatingId === ticket.id}
                              className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50">
                              {updatingId === ticket.id ? '…' : 'Complete'}
                            </button>
                          )}
                          {ticket.status !== 'COMPLETED' && (
                            <button onClick={() => updateTicketStatus(ticket.id, 'DELAYED')} disabled={updatingId === ticket.id}
                              className="px-3 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50">
                              Delay
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center text-gray-500">
          <Activity size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="font-medium">Analytics summary shown in stats above</p>
          <p className="text-sm mt-1">Switch to Board view to manage tickets</p>
        </div>
      )}
    </div>
  );
}
