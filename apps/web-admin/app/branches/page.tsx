'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Plus, Edit2, Trash2, Phone, MapPin, User, Search } from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  managerName?: string;
  openingTime?: string;
  closingTime?: string;
  isActive: boolean;
  isHeadOffice: boolean;
}

const emptyForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  taxId: '',
  openingTime: '09:00',
  closingTime: '23:00',
  isHeadOffice: false,
  isActive: true,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/branches');
      const data = res.data?.data;
      setBranches(data?.branches || data?.items || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (b: Branch) => {
    setEditingId(b.id);
    setForm({
      name: b.name,
      code: b.code,
      address: b.address || '',
      city: b.city || '',
      phone: b.phone || '',
      email: b.email || '',
      taxId: b.taxId || '',
      openingTime: b.openingTime || '09:00',
      closingTime: b.closingTime || '23:00',
      isHeadOffice: b.isHeadOffice,
      isActive: b.isActive,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (b: Branch) => {
    try {
      await apiClient.put(`/branches/${b.id}`, { isActive: !b.isActive });
      toast.success('Branch updated');
      fetchData();
    } catch {
      toast.error('Failed to update branch');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this branch?')) return;
    try {
      await apiClient.delete(`/branches/${id}`);
      toast.success('Branch deleted');
      setBranches(prev => prev.filter(b => b.id !== id));
    } catch {
      toast.error('Failed to delete branch');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiClient.put(`/branches/${editingId}`, form);
        toast.success('Branch updated');
      } else {
        await apiClient.post('/branches', form);
        toast.success('Branch created');
      }
      closeModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-2 font-medium">Manage all restaurant locations</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[#E53935] hover:bg-[#c62b28] text-white">
          <Plus size={18} /> Add Branch
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, code, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-300 focus:outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-20 text-center border border-neutral-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading branches...</p>
        </div>
      ) : (
        <Table headers={['Code', 'Name', 'City', 'Phone', 'Manager', 'Status', 'Actions']}>
          {filtered.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-mono font-bold text-sm">{b.code}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="font-bold">{b.name}</span>
                  {b.isHeadOffice && <Badge variant="info">HQ</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-gray-600">
                {b.city ? (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} className="text-gray-400" /> {b.city}
                  </span>
                ) : '—'}
              </TableCell>
              <TableCell className="text-gray-600">
                {b.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone size={14} className="text-gray-400" /> {b.phone}
                  </span>
                ) : '—'}
              </TableCell>
              <TableCell className="text-gray-600">
                {b.managerName ? (
                  <span className="flex items-center gap-1">
                    <User size={14} className="text-gray-400" /> {b.managerName}
                  </span>
                ) : '—'}
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleToggleActive(b)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    b.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {b.isActive ? 'Active' : 'Inactive'}
                </button>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(b)}
                    className="p-2 text-gray-400 hover:text-[#E53935] hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400">No branches found</TableCell>
            </TableRow>
          )}
        </Table>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editingId ? 'Edit Branch' : 'Add Branch'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Code *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none uppercase"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Tax ID</label>
              <input
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Opening Time</label>
              <input
                type="time"
                value={form.openingTime}
                onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Closing Time</label>
              <input
                type="time"
                value={form.closingTime}
                onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isHeadOffice}
              onChange={(e) => setForm({ ...form, isHeadOffice: e.target.checked })}
              className="w-5 h-5 accent-[#E53935]"
            />
            <span className="font-semibold text-gray-700">This is the Head Office</span>
          </label>
          <div className="flex gap-4 pt-2">
            <Button variant="outline" type="button" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
