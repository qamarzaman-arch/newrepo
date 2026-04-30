'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Printer, RefreshCw, QrCode as QrCodeIcon, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

interface Table {
  id: string;
  number: string | number;
  branchId?: string;
  branch?: { id: string; name: string };
}

interface QrSession {
  id: string;
  token: string;
  status: 'ACTIVE' | 'ORDERED' | 'CLOSED' | string;
  startedAt: string;
  expiresAt: string;
  closedAt?: string | null;
  table?: { id: string; number: string | number } | null;
  branch?: { id: string; name: string } | null;
}

export default function QrCodesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ token: string; expiresAt: string } | null>(null);
  const [sessions, setSessions] = useState<QrSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const res = await apiClient.get('/tables');
      const list: Table[] = res.data?.data?.tables ?? res.data?.data ?? [];
      setTables(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await apiClient.get('/qr-ordering/admin/sessions');
      setSessions(res.data?.data?.sessions ?? []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || 'Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
    loadSessions();
  }, [loadTables, loadSessions]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const body: { tableId?: string } = {};
      if (selectedTableId) body.tableId = selectedTableId;
      const res = await apiClient.post('/qr-ordering/sessions', body);
      const data = res.data?.data;
      setCreated({ token: data.token, expiresAt: data.expiresAt });
      loadSessions();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || 'Failed to create QR session');
    } finally {
      setCreating(false);
    }
  };

  const handleExpire = async (id: string) => {
    if (!confirm('Expire this QR session? Customers will no longer be able to order.')) return;
    try {
      await apiClient.post(`/qr-ordering/admin/expire/${id}`);
      loadSessions();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(e.response?.data?.error?.message || 'Failed to expire session');
    }
  };

  const customerUrl = (token: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/qr/${token}` : `/qr/${token}`;

  const qrSrc = (token: string, size = 300) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      customerUrl(token),
    )}`;

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <QrCodeIcon className="w-6 h-6" /> QR Codes
          </h1>
          <p className="text-gray-500 text-sm">
            Generate per-table QR codes diners scan to order from their phone.
          </p>
        </div>
        <button
          onClick={loadSessions}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Generator */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 print:hidden">
        <h2 className="font-semibold text-gray-900 mb-3">Generate New QR</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Table</label>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">No specific table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table #{String(t.number)}
                  {t.branch?.name ? ` — ${t.branch.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-5 py-2 rounded-lg text-white font-semibold disabled:opacity-60"
            style={{ background: '#E53935' }}
          >
            {creating ? 'Generating...' : 'Generate QR'}
          </button>
        </div>
      </div>

      {/* Created QR display */}
      {created && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center print:border-0">
          <div className="flex justify-end print:hidden">
            <button
              onClick={() => setCreated(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Scan to order</h2>
          <p className="text-xs text-gray-500 mb-4">
            Expires {new Date(created.expiresAt).toLocaleString()}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc(created.token)}
            alt="QR code"
            className="mx-auto mb-4"
            width={300}
            height={300}
          />
          <div className="flex items-center justify-center gap-2 mb-4 text-sm">
            <code className="bg-gray-100 px-2 py-1 rounded break-all">
              {customerUrl(created.token)}
            </code>
            <button
              onClick={() => copyUrl(customerUrl(created.token))}
              className="text-gray-500 hover:text-gray-800 print:hidden"
              aria-label="copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold print:hidden"
            style={{ background: '#E53935' }}
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      )}

      {/* Active sessions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden print:hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Active QR Sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingSessions && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!loadingSessions && sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No QR sessions yet.
                  </td>
                </tr>
              )}
              {sessions.map((s) => {
                const closed = s.status === 'CLOSED';
                return (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      {s.table ? `#${String(s.table.number)}` : '—'}
                    </td>
                    <td className="px-4 py-3">{s.branch?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : s.status === 'ORDERED'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(s.expiresAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {!closed ? (
                        <button
                          onClick={() => handleExpire(s.id)}
                          className="text-xs font-semibold px-3 py-1 rounded text-white"
                          style={{ background: '#E53935' }}
                        >
                          Expire
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
