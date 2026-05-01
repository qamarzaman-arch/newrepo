'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Send, Edit2, Trash2, Mail, MessageSquare, Bell, Users, BarChart3 } from 'lucide-react';
import { Button, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type CampaignType = 'EMAIL' | 'SMS' | 'PUSH';

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  audience: string;
  subject?: string;
  message: string;
  scheduledAt?: string;
  status: CampaignStatus;
  recipientCount?: number;
  deliveredCount?: number;
  openedCount?: number;
}

const emptyForm = {
  name: '',
  type: 'EMAIL' as CampaignType,
  audience: 'ALL',
  subject: '',
  message: '',
  scheduledAt: '',
};

const TABS: Array<{ key: CampaignStatus; label: string }> = [
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CampaignStatus>('DRAFT');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/marketing/campaigns');
      const data = res.data?.data;
      setCampaigns(data?.campaigns || data?.items || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      audience: c.audience,
      subject: c.subject || '',
      message: c.message,
      scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      toast.error('Name and message are required');
      return;
    }
    if (form.type === 'EMAIL' && !form.subject.trim()) {
      toast.error('Subject is required for email campaigns');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: any = { ...form };
      if (payload.scheduledAt) payload.scheduledAt = new Date(payload.scheduledAt).toISOString();
      else delete payload.scheduledAt;
      if (editingId) {
        await apiClient.put(`/marketing/campaigns/${editingId}`, payload);
        toast.success('Campaign updated');
      } else {
        await apiClient.post('/marketing/campaigns', payload);
        toast.success('Campaign created');
      }
      closeModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async (c: Campaign) => {
    if (!confirm(`Send campaign "${c.name}" now?`)) return;
    try {
      const res = await apiClient.post(`/marketing/campaigns/${c.id}/send`);
      const sent = res.data?.data?.recipientCount ?? res.data?.data?.sent ?? 0;
      toast.success(`Sent to ${sent} recipients`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send campaign');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await apiClient.delete(`/marketing/campaigns/${id}`);
      toast.success('Campaign deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const filtered = campaigns.filter(c => c.status === activeTab);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'SCHEDULED').length,
    recipients: campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0),
  };

  const typeIcon = (type: CampaignType) => {
    if (type === 'EMAIL') return <Mail size={14} />;
    if (type === 'SMS') return <MessageSquare size={14} />;
    return <Bell size={14} />;
  };

  const typeBadge = (type: CampaignType) => {
    const colors: Record<CampaignType, string> = {
      EMAIL: 'bg-blue-100 text-blue-700 border-blue-200',
      SMS: 'bg-purple-100 text-purple-700 border-purple-200',
      PUSH: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[type]}`}>
        {typeIcon(type)} {type}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Marketing Campaigns</h1>
          <p className="text-gray-500 mt-2 font-medium">Email, SMS, and push notification campaigns</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[#E53935] hover:bg-[#c62b28] text-white">
          <Plus size={18} /> Create Campaign
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-red-50 text-[#E53935]"><Megaphone size={24} /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Campaigns</p>
              <h3 className="text-2xl font-black">{stats.total}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-50 text-green-600"><BarChart3 size={24} /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active</p>
              <h3 className="text-2xl font-black">{stats.active}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><Users size={24} /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Recipients</p>
              <h3 className="text-2xl font-black">{stats.recipients}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 p-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex gap-2 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.key ? 'bg-[#E53935] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({campaigns.filter(c => c.status === tab.key).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-20 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading campaigns...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-16 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <Megaphone size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">No {activeTab.toLowerCase()} campaigns</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-6 hover:border-red-200 transition-all">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-lg font-extrabold text-gray-900">{c.name}</h3>
                {typeBadge(c.type)}
              </div>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.message}</p>
              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <div><span className="font-semibold">Audience:</span> {c.audience}</div>
                {c.scheduledAt && (
                  <div><span className="font-semibold">Scheduled:</span> {new Date(c.scheduledAt).toLocaleString()}</div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400 font-bold">Recipients</div>
                  <div className="text-lg font-black text-gray-900">{c.recipientCount || 0}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400 font-bold">Delivered</div>
                  <div className="text-lg font-black text-green-600">{c.deliveredCount || 0}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400 font-bold">Opened</div>
                  <div className="text-lg font-black text-blue-600">{c.openedCount || 0}</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                  <button
                    onClick={() => handleSend(c)}
                    className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                  >
                    <Send size={14} /> Send Now
                  </button>
                )}
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-2 text-gray-400 hover:text-[#E53935] hover:bg-red-50 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {c.status === 'DRAFT' && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? 'Edit Campaign' : 'Create Campaign'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-700">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CampaignType })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="PUSH">Push Notification</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Audience *</label>
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              >
                <option value="ALL">All Customers</option>
                <option value="VIP">VIP Customers</option>
                <option value="NEW">New Customers</option>
                <option value="INACTIVE">Inactive Customers</option>
              </select>
            </div>
          </div>
          {form.type === 'EMAIL' && (
            <div>
              <label className="text-sm font-bold text-gray-700">Subject *</label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-gray-700">Message *</label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700" htmlFor="campaign-schedule">Schedule For</label>
            <input
              id="campaign-schedule"
              type="datetime-local"
              value={form.scheduledAt}
              // QA C54: prevent scheduling for the past.
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
              onChange={(e) => {
                const v = e.target.value;
                if (v && new Date(v).getTime() < Date.now()) {
                  // Snap to "now" rather than rejecting silently.
                  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
                    .toISOString().slice(0, 16);
                  setForm({ ...form, scheduledAt: now });
                  return;
                }
                setForm({ ...form, scheduledAt: v });
              }}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            />
          </div>
          <div className="flex gap-4 pt-2">
            <Button variant="outline" type="button" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
