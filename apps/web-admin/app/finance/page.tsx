'use client';

import React, { useEffect, useState } from 'react';
import { Plus, BookOpen, TrendingUp, Scale, FileText, X, Ban } from 'lucide-react';
import { Button, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

type Tab = 'pl' | 'bs' | 'je';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface JELine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  refType?: string;
  branchId?: string;
  lines?: Array<{ accountId: string; accountName?: string; debit: number; credit: number; description?: string }>;
}

interface Branch { id: string; name: string; }

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStartISO = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('pl');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branchId, setBranchId] = useState<string>('');

  // P&L
  const [plFrom, setPlFrom] = useState(monthStartISO());
  const [plTo, setPlTo] = useState(todayISO());
  const [plData, setPlData] = useState<any>(null);
  const [plLoading, setPlLoading] = useState(false);

  // Balance Sheet
  const [bsAsOf, setBsAsOf] = useState(todayISO());
  const [bsData, setBsData] = useState<any>(null);
  const [bsLoading, setBsLoading] = useState(false);

  // Journal entries
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [jeLoading, setJeLoading] = useState(false);
  const [jePage, setJePage] = useState(1);
  const [jeTotalPages, setJeTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showJeModal, setShowJeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jeForm, setJeForm] = useState({
    date: todayISO(),
    description: '',
    refType: 'MANUAL',
    branchId: '',
    lines: [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ] as JELine[],
  });

  const loadAccountsAndBranches = async () => {
    try {
      const [accRes, brRes] = await Promise.all([
        apiClient.get('/accounting/accounts'),
        apiClient.get('/branches'),
      ]);
      const accs = accRes.data?.data?.accounts || accRes.data?.data?.items || accRes.data?.data || [];
      const brs = brRes.data?.data?.branches || brRes.data?.data?.items || brRes.data?.data || [];
      setAccounts(accs);
      setBranches(brs);
    } catch {
      // ignore
    }
  };

  useEffect(() => { loadAccountsAndBranches(); }, []);

  const loadPL = async () => {
    setPlLoading(true);
    try {
      const params: any = { from: plFrom, to: plTo };
      if (branchId) params.branchId = branchId;
      const res = await apiClient.get('/accounting/reports/profit-loss', { params });
      setPlData(res.data?.data || null);
    } catch (err: any) {
      toast.error('Failed to load P&L');
    } finally {
      setPlLoading(false);
    }
  };

  const loadBS = async () => {
    setBsLoading(true);
    try {
      const params: any = { asOf: bsAsOf };
      if (branchId) params.branchId = branchId;
      const res = await apiClient.get('/accounting/reports/balance-sheet', { params });
      setBsData(res.data?.data || null);
    } catch {
      toast.error('Failed to load balance sheet');
    } finally {
      setBsLoading(false);
    }
  };

  const loadEntries = async () => {
    setJeLoading(true);
    try {
      const res = await apiClient.get('/accounting/journal-entries', { params: { page: jePage, limit: 20 } });
      const d = res.data?.data;
      setEntries(d?.entries || d?.items || d || []);
      setJeTotalPages(d?.totalPages || 1);
    } catch {
      toast.error('Failed to load journal entries');
    } finally {
      setJeLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'pl') loadPL();
    if (tab === 'bs') loadBS();
    if (tab === 'je') loadEntries();
  }, [tab, jePage]);

  const totalDebit = jeForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = jeForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error('Entries must balance and be greater than zero');
      return;
    }
    if (!jeForm.description.trim()) {
      toast.error('Description is required');
      return;
    }
    const validLines = jeForm.lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error('At least two lines required');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/accounting/journal-entries', {
        date: jeForm.date,
        description: jeForm.description,
        refType: jeForm.refType,
        branchId: jeForm.branchId || undefined,
        lines: validLines.map(l => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description,
        })),
      });
      toast.success('Journal entry created');
      setShowJeModal(false);
      setJeForm({
        date: todayISO(),
        description: '',
        refType: 'MANUAL',
        branchId: '',
        lines: [
          { accountId: '', debit: 0, credit: 0, description: '' },
          { accountId: '', debit: 0, credit: 0, description: '' },
        ],
      });
      loadEntries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Void this journal entry?')) return;
    try {
      await apiClient.post(`/accounting/journal-entries/${id}/void`);
      toast.success('Entry voided');
      loadEntries();
    } catch {
      toast.error('Failed to void entry');
    }
  };

  const updateLine = (idx: number, patch: Partial<JELine>) => {
    const lines = [...jeForm.lines];
    lines[idx] = { ...lines[idx], ...patch };
    setJeForm({ ...jeForm, lines });
  };

  const renderSection = (title: string, items: any[] = [], total?: number, color = 'text-gray-900') => (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
      <div className="bg-gray-50 dark:bg-neutral-900 px-6 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="font-extrabold text-gray-900">{title}</h3>
      </div>
      <div className="p-6 space-y-2">
        {items && items.length > 0 ? (
          items.map((row: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{row.accountName || row.name || row.account || '—'}</span>
              <span className="font-mono font-semibold">{fmt(row.amount || row.balance || 0)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">No data</p>
        )}
        {total !== undefined && (
          <div className="flex justify-between border-t-2 border-gray-200 pt-3 mt-3">
            <span className="font-extrabold">Total</span>
            <span className={`font-mono font-extrabold ${color}`}>{fmt(total)}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">Finance & Accounting</h1>
        <p className="text-gray-500 mt-2 font-medium">Reports and journal entries</p>
      </header>

      <div className="bg-white dark:bg-neutral-800 p-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex gap-2 w-fit">
        <button
          onClick={() => setTab('pl')}
          className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === 'pl' ? 'bg-[#E53935] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        ><TrendingUp size={16} /> Profit & Loss</button>
        <button
          onClick={() => setTab('bs')}
          className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === 'bs' ? 'bg-[#E53935] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        ><Scale size={16} /> Balance Sheet</button>
        <button
          onClick={() => setTab('je')}
          className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${tab === 'je' ? 'bg-[#E53935] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        ><BookOpen size={16} /> Journal Entries</button>
      </div>

      {tab === 'pl' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-bold text-gray-600">From</label>
              <input type="date" value={plFrom} onChange={(e) => setPlFrom(e.target.value)} className="block mt-1 px-3 py-2 bg-gray-50 border border-neutral-200 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">To</label>
              <input type="date" value={plTo} onChange={(e) => setPlTo(e.target.value)} className="block mt-1 px-3 py-2 bg-gray-50 border border-neutral-200 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="block mt-1 px-3 py-2 bg-gray-50 border border-neutral-200 rounded-lg">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <Button onClick={loadPL} className="bg-[#E53935] hover:bg-[#c62b28] text-white">Generate</Button>
          </div>

          {plLoading ? (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-20 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : plData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSection('Revenue', plData.revenue?.accounts || plData.revenueAccounts || [], plData.totalRevenue || plData.revenue?.total || 0, 'text-green-600')}
              {renderSection('Expenses', plData.expenses?.accounts || plData.expenseAccounts || [], plData.totalExpenses || plData.expenses?.total || 0, 'text-red-600')}
              <div className="md:col-span-2 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-8 text-center">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Net Profit</p>
                <h2 className={`text-5xl font-black mt-2 ${(plData.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(plData.netProfit || 0)}
                </h2>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'bs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-bold text-gray-600">As Of</label>
              <input type="date" value={bsAsOf} onChange={(e) => setBsAsOf(e.target.value)} className="block mt-1 px-3 py-2 bg-gray-50 border border-neutral-200 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="block mt-1 px-3 py-2 bg-gray-50 border border-neutral-200 rounded-lg">
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <Button onClick={loadBS} className="bg-[#E53935] hover:bg-[#c62b28] text-white">Generate</Button>
          </div>

          {bsLoading ? (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-20 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : bsData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderSection('Assets', bsData.assets?.accounts || [], bsData.totalAssets || bsData.assets?.total || 0, 'text-blue-600')}
                {renderSection('Liabilities', bsData.liabilities?.accounts || [], bsData.totalLiabilities || bsData.liabilities?.total || 0, 'text-orange-600')}
                {renderSection('Equity', bsData.equity?.accounts || [], bsData.totalEquity || bsData.equity?.total || 0, 'text-purple-600')}
              </div>
              {(() => {
                const a = bsData.totalAssets || bsData.assets?.total || 0;
                const l = bsData.totalLiabilities || bsData.liabilities?.total || 0;
                const e = bsData.totalEquity || bsData.equity?.total || 0;
                const balanced = Math.abs(a - (l + e)) < 0.01;
                return (
                  <div className={`p-4 rounded-2xl border-2 text-center font-bold ${balanced ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {balanced ? 'Balanced: Assets = Liabilities + Equity' : `Out of balance: ${fmt(a)} vs ${fmt(l + e)}`}
                  </div>
                );
              })()}
            </>
          ) : null}
        </div>
      )}

      {tab === 'je' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Page {jePage} of {jeTotalPages}</p>
            <Button onClick={() => setShowJeModal(true)} className="bg-[#E53935] hover:bg-[#c62b28] text-white">
              <Plus size={18} /> New Entry
            </Button>
          </div>

          {jeLoading ? (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-20 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                  <tr className="text-xs font-bold text-gray-600 uppercase">
                    <th className="px-4 py-3 text-left">Entry #</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400"><FileText className="mx-auto mb-2 text-gray-300" size={32} />No journal entries</td></tr>
                  ) : entries.map(je => (
                    <React.Fragment key={je.id}>
                      <tr
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === je.id ? null : je.id)}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-sm">{je.entryNumber}</td>
                        <td className="px-4 py-3 text-sm">{new Date(je.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">{je.description}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(je.totalDebit)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmt(je.totalCredit)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${je.status === 'POSTED' ? 'bg-green-100 text-green-700' : je.status === 'VOIDED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{je.status}</span></td>
                        <td className="px-4 py-3">
                          {je.status === 'POSTED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVoid(je.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Void"
                            ><Ban size={16} /></button>
                          )}
                        </td>
                      </tr>
                      {expandedId === je.id && je.lines && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="p-4">
                            <table className="w-full text-sm">
                              <thead className="text-xs text-gray-500 font-bold">
                                <tr>
                                  <th className="text-left py-1">Account</th>
                                  <th className="text-left py-1">Description</th>
                                  <th className="text-right py-1">Debit</th>
                                  <th className="text-right py-1">Credit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {je.lines.map((l, i) => (
                                  <tr key={i} className="border-t border-gray-200">
                                    <td className="py-1.5">{l.accountName || l.accountId}</td>
                                    <td className="py-1.5 text-gray-500">{l.description || '—'}</td>
                                    <td className="py-1.5 text-right font-mono">{l.debit ? fmt(l.debit) : '—'}</td>
                                    <td className="py-1.5 text-right font-mono">{l.credit ? fmt(l.credit) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {jeTotalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" disabled={jePage <= 1} onClick={() => setJePage(p => p - 1)}>Previous</Button>
              <Button variant="outline" disabled={jePage >= jeTotalPages} onClick={() => setJePage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showJeModal} onClose={() => setShowJeModal(false)} title="New Journal Entry">
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700">Date *</label>
              <input
                required type="date" value={jeForm.date}
                onChange={(e) => setJeForm({ ...jeForm, date: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Reference Type</label>
              <select
                value={jeForm.refType}
                onChange={(e) => setJeForm({ ...jeForm, refType: e.target.value })}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
              >
                <option value="MANUAL">Manual</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700">Description *</label>
            <input
              required value={jeForm.description}
              onChange={(e) => setJeForm({ ...jeForm, description: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700">Branch</label>
            <select
              value={jeForm.branchId}
              onChange={(e) => setJeForm({ ...jeForm, branchId: e.target.value })}
              className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            >
              <option value="">— None —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-700">Lines</label>
              <button
                type="button"
                onClick={() => setJeForm({ ...jeForm, lines: [...jeForm.lines, { accountId: '', debit: 0, credit: 0, description: '' }] })}
                className="text-xs font-bold text-[#E53935] hover:text-[#c62b28] flex items-center gap-1"
              ><Plus size={14} /> Add Line</button>
            </div>
            <div className="space-y-2">
              {jeForm.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                    className="col-span-4 px-2 py-2 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                  <input
                    type="text" placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    className="col-span-3 px-2 py-2 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-lg text-sm focus:outline-none"
                  />
                  <input
                    type="number" step="0.01" placeholder="Debit" min="0"
                    value={line.debit || ''}
                    onChange={(e) => updateLine(idx, { debit: Number(e.target.value), credit: 0 })}
                    className="col-span-2 px-2 py-2 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-lg text-sm focus:outline-none"
                  />
                  <input
                    type="number" step="0.01" placeholder="Credit" min="0"
                    value={line.credit || ''}
                    onChange={(e) => updateLine(idx, { credit: Number(e.target.value), debit: 0 })}
                    className="col-span-2 px-2 py-2 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-lg text-sm focus:outline-none"
                  />
                  {jeForm.lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setJeForm({ ...jeForm, lines: jeForm.lines.filter((_, i) => i !== idx) })}
                      className="col-span-1 text-gray-400 hover:text-red-500"
                    ><X size={16} /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-2 mt-3 pt-3 border-t border-gray-100 text-sm font-bold">
              <span className="col-span-7 text-right text-gray-600">Totals:</span>
              <span className="col-span-2 px-2 font-mono">{fmt(totalDebit)}</span>
              <span className="col-span-2 px-2 font-mono">{fmt(totalCredit)}</span>
            </div>
            {!isBalanced && totalDebit + totalCredit > 0 && (
              <p className="text-xs text-red-600 mt-2 font-medium">Debits must equal credits</p>
            )}
          </div>

          <div className="flex gap-4 pt-2">
            <Button variant="outline" type="button" className="flex-1" onClick={() => setShowJeModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white" disabled={isSubmitting || !isBalanced}>
              {isSubmitting ? 'Saving...' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
