'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  LayoutGrid, List, Plus, RefreshCw, AlertTriangle, Edit2, Trash2, X, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING', 'OUT_OF_ORDER'] as const;
type TableStatus = typeof STATUS_OPTIONS[number];

const STATUS_STYLES: Record<TableStatus, string> = {
  AVAILABLE:      'bg-green-100 text-green-800 border-green-200',
  OCCUPIED:       'bg-red-100 text-red-800 border-red-200',
  RESERVED:       'bg-amber-100 text-amber-800 border-amber-200',
  NEEDS_CLEANING: 'bg-orange-100 text-orange-800 border-orange-200',
  OUT_OF_ORDER:   'bg-gray-100 text-gray-600 border-gray-200',
};

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  location?: string;
  shape?: string;
  isActive: boolean;
}

const EMPTY_FORM = { tableNumber: '', capacity: 4, location: '', shape: 'RECTANGLE', status: 'AVAILABLE' as TableStatus };

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/tables');
      setTables(res.data?.data?.tables || []);
    } catch {
      setError('Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const openAdd = () => { setEditingTable(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (t: Table) => { setEditingTable(t); setForm({ tableNumber: t.tableNumber, capacity: t.capacity, location: t.location || '', shape: t.shape || 'RECTANGLE', status: t.status }); setShowModal(true); };

  const saveTable = async () => {
    if (!form.tableNumber) {
      toast.error('Table number required');
      return;
    }
    setSaving(true);
    try {
      if (editingTable) {
        await apiClient.put(`/tables/${editingTable.id}`, form);
      } else {
        await apiClient.post('/tables', form);
      }
      setShowModal(false);
      await fetchTables();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: TableStatus) => {
    try {
      await apiClient.patch(`/tables/${id}/status`, { status });
      await fetchTables();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    try {
      await apiClient.delete(`/tables/${id}`);
      await fetchTables();
    } catch {
      toast.error('Failed to delete table');
    }
  };

  const filtered = tables.filter(t => {
    const matchSearch = !searchQuery || t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) || (t.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'AVAILABLE').length,
    occupied: tables.filter(t => t.status === 'OCCUPIED').length,
    reserved: tables.filter(t => t.status === 'RESERVED').length,
    needsCleaning: tables.filter(t => t.status === 'NEEDS_CLEANING').length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Tables</h1>
          <p className="text-gray-500 mt-1">Manage restaurant floor layout and table status</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTables} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
            <Plus size={16} /> Add Table
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Available', value: stats.available, color: 'text-green-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-red-600' },
          { label: 'Reserved', value: stats.reserved, color: 'text-amber-600' },
          { label: 'Cleaning', value: stats.needsCleaning, color: 'text-orange-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search table number or location…"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}><List size={16} /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filtered.map(table => (
            <div key={table.id} className={`bg-white rounded-2xl border-2 p-4 shadow-sm hover:shadow-md transition-all ${STATUS_STYLES[table.status]}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-extrabold text-gray-900">#{table.tableNumber}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(table)} className="p-1 hover:bg-white rounded-lg transition-colors"><Edit2 size={12} /></button>
                  <button onClick={() => deleteTable(table.id)} className="p-1 hover:bg-white rounded-lg transition-colors text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
              <p className="text-xs font-bold">{table.capacity} seats</p>
              {table.location && <p className="text-xs text-gray-500 mt-0.5">{table.location}</p>}
              <select value={table.status} onChange={e => updateStatus(table.id, e.target.value as TableStatus)}
                className="mt-2 w-full text-xs border-0 bg-transparent font-bold focus:outline-none cursor-pointer">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-32 text-gray-400">
              <p className="font-medium">No tables found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Table #', 'Capacity', 'Status', 'Location', 'Shape', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(table => (
                <tr key={table.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900">#{table.tableNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{table.capacity}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[table.status]}`}>{table.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{table.location || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{(table.shape || '—').toLowerCase()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(table)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => deleteTable(table.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-gray-900">{editingTable ? 'Edit Table' : 'Add Table'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            {[
              { label: 'Table Number', key: 'tableNumber', type: 'text', placeholder: 'e.g. 1, A1' },
              { label: 'Capacity (seats)', key: 'capacity', type: 'number', placeholder: '4' },
              { label: 'Location', key: 'location', type: 'text', placeholder: 'e.g. Main Hall, Patio' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-bold text-gray-700 mb-1">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as TableStatus }))}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={saveTable} disabled={saving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                {editingTable ? 'Save Changes' : 'Add Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
