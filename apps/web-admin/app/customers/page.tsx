'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Users, Search, Plus, RefreshCw, AlertTriangle, Edit2, Trash2,
  X, Check, Star, ChevronLeft, ChevronRight, Phone, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  lastVisitAt: string | null;
  isActive: boolean;
}

interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  discount: number;
  color: string;
}

const TABS = ['customers', 'loyalty'] as const;
type Tab = typeof TABS[number];

const EMPTY_CUSTOMER = { firstName: '', lastName: '', email: '', phone: '' };

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (searchQuery) params.search = searchQuery;
      const res = await apiClient.get('/customers', { params });
      const data = res.data?.data;
      setCustomers(data?.customers || []);
      const pagination = data?.pagination;
      if (pagination) setTotalPages(Math.ceil(pagination.total / 20) || 1);
    } catch {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  const fetchTiers = useCallback(async () => {
    try {
      const res = await apiClient.get('/customers/loyalty/tiers');
      setTiers(res.data?.data?.tiers || []);
    } catch {
      // Loyalty tiers are optional — silently degrade to empty list
      setTiers([]);
    }
  }, []);

  useEffect(() => { fetchCustomers(); fetchTiers(); }, [fetchCustomers, fetchTiers]);

  const openAdd = () => { setEditingCustomer(null); setForm(EMPTY_CUSTOMER); setShowModal(true); };
  const openEdit = (c: Customer) => { setEditingCustomer(c); setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email || '', phone: c.phone || '' }); setShowModal(true); };

  const saveCustomer = async () => {
    if (!form.firstName) {
      toast.error('First name required');
      return;
    }
    setSaving(true);
    try {
      if (editingCustomer) {
        await apiClient.put(`/customers/${editingCustomer.id}`, form);
      } else {
        await apiClient.post('/customers', form);
      }
      setShowModal(false);
      await fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await apiClient.delete(`/customers/${id}`);
      await fetchCustomers();
    } catch {
      toast.error('Failed to delete customer');
    }
  };

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.isActive).length,
    loyaltyMembers: customers.filter(c => c.loyaltyPoints > 0).length,
    avgSpend: customers.length ? customers.reduce((s, c) => s + Number(c.totalSpent), 0) / customers.length : 0,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage customer profiles and loyalty</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCustomers} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: stats.active, icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Loyalty Members', value: stats.loyaltyMembers, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Avg. Spend', value: `$${stats.avgSpend.toFixed(2)}`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color} mb-3`}><s.icon size={20} /></div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'customers' ? 'Customers' : 'Loyalty Tiers'}
          </button>
        ))}
      </div>

      {activeTab === 'customers' && (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or phone…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Users size={40} className="mb-3 text-gray-200" />
                <p className="font-medium">No customers found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Contact', 'Loyalty Pts', 'Total Spent', 'Last Visit', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900">{c.firstName} {c.lastName}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {c.email && <div className="flex items-center gap-1 text-gray-500"><Mail size={11} /> {c.email}</div>}
                          {c.phone && <div className="flex items-center gap-1 text-gray-500"><Phone size={11} /> {c.phone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" />
                          <span className="font-bold text-gray-900">{c.loyaltyPoints}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">${Number(c.totalSpent).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => deleteCustomer(c.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-100 rounded-lg transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'loyalty' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {tiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Star size={40} className="mb-3 text-gray-200" />
              <p className="font-medium">No loyalty tiers configured</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Tier', 'Min Points', 'Discount', 'Color'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tiers.map(tier => (
                  <tr key={tier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{tier.name}</td>
                    <td className="px-4 py-3 text-gray-600">{tier.minPoints} pts</td>
                    <td className="px-4 py-3 font-bold text-green-600">{tier.discount}% off</td>
                    <td className="px-4 py-3"><div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: tier.color }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-gray-900">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            {[
              { label: 'First Name', key: 'firstName', placeholder: 'John' },
              { label: 'Last Name', key: 'lastName', placeholder: 'Doe' },
              { label: 'Email', key: 'email', placeholder: 'john@example.com' },
              { label: 'Phone', key: 'phone', placeholder: '+1 555 0000' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-bold text-gray-700 mb-1">{f.label}</label>
                <input type="text" placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={saveCustomer} disabled={saving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                {editingCustomer ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
