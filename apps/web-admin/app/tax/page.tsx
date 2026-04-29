'use client';

import React, { useEffect, useState } from 'react';
import { Receipt, RefreshCw, Plus } from 'lucide-react';
import { Button, Modal, Badge } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

type Authority = 'FBR' | 'PRA' | 'SRB';
type Status = 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

interface TaxFiling {
  id: string;
  invoiceNumber: string;
  authority: Authority;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  taxAmount: number;
  status: Status;
  submittedAt?: string;
  fbrInvoiceNumber?: string;
}

interface AuthoritySummary {
  authority: Authority;
  totalAmount: number;
  totalTax: number;
  pending: number;
  submitted: number;
  accepted: number;
  rejected: number;
}

interface OrderOption { id: string; orderNumber: string; }

const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TaxPage() {
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [summary, setSummary] = useState<AuthoritySummary[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAuthority, setFilterAuthority] = useState<Authority | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState<Authority>('FBR');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (filterAuthority) params.authority = filterAuthority;
      if (filterStatus) params.status = filterStatus;
      const [taxRes, sumRes] = await Promise.all([
        apiClient.get('/tax', { params }),
        apiClient.get('/tax/summary'),
      ]);
      const d = taxRes.data?.data;
      setFilings(d?.filings || d?.items || d || []);
      const s = sumRes.data?.data;
      setSummary(Array.isArray(s) ? s : (s?.summary || s?.byAuthority || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load tax filings');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await apiClient.get('/orders', { params: { limit: 100 } });
      const d = res.data?.data;
      setOrders(d?.orders || d?.items || d || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchData(); }, [filterAuthority, filterStatus]);
  useEffect(() => { loadOrders(); }, []);

  const handleRetry = async (id: string) => {
    if (!confirm('Retry this tax submission?')) return;
    try {
      await apiClient.post(`/tax/retry/${id}`);
      toast.success('Retry initiated');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to retry');
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/tax/submit/${selectedOrderId}`, { authority: selectedAuthority });
      toast.success('Tax filing submitted');
      setShowSubmitModal(false);
      setSelectedOrderId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadge = (s: Status) => {
    const map: Record<Status, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
      PENDING: 'warning', SUBMITTED: 'info', ACCEPTED: 'success', REJECTED: 'error',
    };
    return <Badge variant={map[s]}>{s}</Badge>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Tax Filings</h1>
          <p className="text-gray-500 mt-2 font-medium">FBR, PRA, and SRB submissions</p>
        </div>
        <Button onClick={() => setShowSubmitModal(true)} className="bg-[#E53935] hover:bg-[#c62b28] text-white">
          <Plus size={18} /> Submit New
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summary.map(s => (
            <div key={s.authority} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-extrabold text-gray-900">{s.authority}</h3>
                <Receipt className="text-[#E53935]" size={24} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Amount:</span><span className="font-mono font-bold">{fmt(s.totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax Amount:</span><span className="font-mono font-bold text-[#E53935]">{fmt(s.totalTax)}</span></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                <div><div className="text-xs text-gray-400 font-bold">Pending</div><div className="text-lg font-black text-amber-600">{s.pending || 0}</div></div>
                <div><div className="text-xs text-gray-400 font-bold">Submitted</div><div className="text-lg font-black text-blue-600">{s.submitted || 0}</div></div>
                <div><div className="text-xs text-gray-400 font-bold">Accepted</div><div className="text-lg font-black text-green-600">{s.accepted || 0}</div></div>
                <div><div className="text-xs text-gray-400 font-bold">Rejected</div><div className="text-lg font-black text-red-600">{s.rejected || 0}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterAuthority(null)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterAuthority === null ? 'bg-[#E53935] text-white border-[#E53935]' : 'bg-white text-gray-600 border-neutral-200 hover:border-red-300'}`}>All Authorities</button>
          {(['FBR', 'PRA', 'SRB'] as Authority[]).map(a => (
            <button key={a} onClick={() => setFilterAuthority(a)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterAuthority === a ? 'bg-[#E53935] text-white border-[#E53935]' : 'bg-white text-gray-600 border-neutral-200 hover:border-red-300'}`}>{a}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterStatus(null)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterStatus === null ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-neutral-200 hover:border-gray-400'}`}>All Status</button>
          {(['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED'] as Status[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterStatus === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-neutral-200 hover:border-gray-400'}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-20 text-center border border-neutral-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-neutral-200">
              <tr className="text-xs font-bold text-gray-600 uppercase">
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Authority</th>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">FBR Inv #</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filings.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400"><Receipt className="mx-auto mb-2 text-gray-300" size={32} />No tax filings</td></tr>
              ) : filings.map(f => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-sm">{f.invoiceNumber}</td>
                  <td className="px-4 py-3"><Badge variant="info">{f.authority}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs">{f.orderNumber || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(f.amount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#E53935] font-bold">{fmt(f.taxAmount)}</td>
                  <td className="px-4 py-3">{statusBadge(f.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{f.submittedAt ? new Date(f.submittedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{f.fbrInvoiceNumber || '—'}</td>
                  <td className="px-4 py-3">
                    {f.status === 'REJECTED' && (
                      <button
                        onClick={() => handleRetry(f.id)}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 flex items-center gap-1"
                      ><RefreshCw size={12} /> Retry</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit New Tax Filing">
        <form onSubmit={handleSubmitNew} className="space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-700">Order *</label>
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            >
              <option value="">Select order</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Authority *</label>
            <div className="flex gap-3">
              {(['FBR', 'PRA', 'SRB'] as Authority[]).map(a => (
                <label key={a} className={`flex-1 cursor-pointer px-4 py-3 rounded-xl border-2 text-center font-bold ${selectedAuthority === a ? 'bg-red-50 border-[#E53935] text-[#E53935]' : 'bg-gray-50 border-transparent text-gray-600'}`}>
                  <input type="radio" name="authority" value={a} checked={selectedAuthority === a} onChange={() => setSelectedAuthority(a)} className="hidden" />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <Button variant="outline" type="button" className="flex-1" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
