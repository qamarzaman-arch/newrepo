'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Globe, MapPin, Phone, User, Check, X } from 'lucide-react';
import { Button, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

type Platform = 'FOODPANDA' | 'UBEREATS' | 'CAREEM' | string;
type ExtStatus = 'RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';

interface ExternalOrder {
  id: string;
  externalId: string;
  platform: Platform;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  totalAmount: number;
  status: ExtStatus;
  receivedAt: string;
  orderId?: string;
  orderNumber?: string;
  rejectionReason?: string;
}

const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const platformStyle = (p: Platform): string => {
  switch (p) {
    case 'FOODPANDA': return 'bg-pink-600 text-white';
    case 'UBEREATS': return 'bg-black text-white';
    case 'CAREEM': return 'bg-green-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
};

export default function ExternalOrdersPage() {
  const [orders, setOrders] = useState<ExternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<Platform | null>(null);
  const [filterStatus, setFilterStatus] = useState<ExtStatus | null>(null);
  const [rejectModal, setRejectModal] = useState<ExternalOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const intervalRef = useRef<any>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const params: any = {};
      if (filterPlatform) params.platform = filterPlatform;
      if (filterStatus) params.status = filterStatus;
      const res = await apiClient.get('/external-platform', { params });
      const d = res.data?.data;
      setOrders(d?.orders || d?.items || d || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load external orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPlatform, filterStatus]);

  const handleAccept = async (o: ExternalOrder) => {
    setBusyId(o.id);
    try {
      const res = await apiClient.post(`/external-platform/${o.id}/accept`);
      const orderNumber = res.data?.data?.orderNumber || res.data?.data?.order?.orderNumber || 'NEW';
      toast.success(`Order #${orderNumber} created`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setBusyId(rejectModal.id);
    try {
      await apiClient.post(`/external-platform/${rejectModal.id}/reject`, { reason: rejectReason });
      toast.success('Order rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setBusyId(null);
    }
  };

  const statusColor = (s: ExtStatus) => {
    switch (s) {
      case 'RECEIVED': return 'bg-amber-100 text-amber-700';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">External Orders</h1>
          <p className="text-gray-500 mt-2 font-medium">Foodpanda, UberEats, Careem (auto-refreshes every 30s)</p>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterPlatform(null)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterPlatform === null ? 'bg-[#E53935] text-white border-[#E53935]' : 'bg-white text-gray-600 border-neutral-200'}`}>All Platforms</button>
          {(['FOODPANDA', 'UBEREATS', 'CAREEM'] as Platform[]).map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterPlatform === p ? 'bg-[#E53935] text-white border-[#E53935]' : 'bg-white text-gray-600 border-neutral-200'}`}>{p}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterStatus(null)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterStatus === null ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-neutral-200'}`}>All Status</button>
          {(['RECEIVED', 'ACCEPTED', 'REJECTED', 'COMPLETED'] as ExtStatus[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterStatus === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-neutral-200'}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-20 text-center border border-neutral-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-neutral-200 shadow-sm">
          <Globe size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">No external orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${platformStyle(o.platform)}`}>
                    <Globe size={12} /> {o.platform}
                  </span>
                  <p className="font-mono text-xs text-gray-500 mt-1">{o.externalId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(o.status)}`}>{o.status}</span>
              </div>

              <div className="space-y-1.5 text-sm">
                {o.customerName && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={14} className="text-gray-400" /> <span className="font-semibold">{o.customerName}</span>
                  </div>
                )}
                {o.customerPhone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400" /> {o.customerPhone}
                  </div>
                )}
                {o.deliveryAddress && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" /> <span className="line-clamp-2">{o.deliveryAddress}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-400">{new Date(o.receivedAt).toLocaleString()}</div>
                <div className="text-xl font-black text-[#E53935]">{fmt(o.totalAmount)}</div>
              </div>

              {o.orderNumber && (
                <div className="text-xs text-gray-500">Linked order: <span className="font-mono font-bold">{o.orderNumber}</span></div>
              )}

              {o.status === 'REJECTED' && o.rejectionReason && (
                <div className="text-xs text-red-700 bg-red-50 p-2 rounded">Reason: {o.rejectionReason}</div>
              )}

              {o.status === 'RECEIVED' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleAccept(o)}
                    disabled={busyId === o.id}
                    className="flex-1 bg-[#E53935] hover:bg-[#c62b28] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1"
                  ><Check size={16} /> Accept</button>
                  <button
                    onClick={() => { setRejectModal(o); setRejectReason(''); }}
                    disabled={busyId === o.id}
                    className="px-4 py-2.5 rounded-xl border-2 border-neutral-200 hover:border-red-300 text-neutral-700 font-bold flex items-center gap-1"
                  ><X size={16} /> Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject Order">
        {rejectModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Reject order <span className="font-mono font-bold">{rejectModal.externalId}</span> from <span className="font-bold">{rejectModal.platform}</span>?
            </p>
            <div>
              <label className="text-sm font-bold text-gray-700">Reason *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Out of stock, store closed..."
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" type="button" className="flex-1" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</Button>
              <Button type="button" className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white" onClick={handleReject} disabled={busyId === rejectModal.id}>
                {busyId === rejectModal.id ? 'Rejecting...' : 'Reject Order'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
