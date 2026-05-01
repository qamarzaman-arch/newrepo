'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle, Check, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

interface Setting {
  id?: string;
  key: string;
  value: string;
  category: string;
  description?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  general:       'General',
  business:      'Business',
  payment:       'Payment',
  tax:           'Tax & Service Charges',
  notifications: 'Notifications',
  loyalty:       'Loyalty Program',
  printer:       'Printers & Hardware',
  commission:    'Commission Rates',
};

// Common keys that should always exist; if missing on load, we surface them as empty rows
const SUGGESTED_KEYS: { key: string; category: string; description: string; defaultValue: string }[] = [
  { key: 'restaurant_name',          category: 'general',  description: 'Restaurant display name',                  defaultValue: '' },
  { key: 'restaurant_address',       category: 'general',  description: 'Address printed on receipts',              defaultValue: '' },
  { key: 'restaurant_phone',         category: 'general',  description: 'Contact phone number',                     defaultValue: '' },
  { key: 'restaurant_email',         category: 'general',  description: 'Contact email',                            defaultValue: '' },
  { key: 'currency',                 category: 'business', description: 'ISO currency code (USD, PKR, EUR…)',      defaultValue: 'USD' },
  { key: 'timezone',                 category: 'business', description: 'IANA timezone',                            defaultValue: 'UTC' },
  { key: 'tax_rate',                 category: 'tax',      description: 'Tax rate (%)',                             defaultValue: '0' },
  { key: 'service_charge_rate',      category: 'tax',      description: 'Service charge rate (%)',                  defaultValue: '0' },
  { key: 'loyalty_points_per_dollar',category: 'loyalty',  description: 'Points awarded per dollar spent',          defaultValue: '1' },
  { key: 'loyalty_min_spend',        category: 'loyalty',  description: 'Minimum spend before earning points',      defaultValue: '0' },
  { key: 'loyalty_points_value',     category: 'loyalty',  description: 'Dollar value per point on redemption',     defaultValue: '0.01' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [original, setOriginal] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('general');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/settings');
      const fetched: Setting[] = res.data?.data?.settings || [];

      // Merge with suggested keys: if a suggested key is not in DB, add a placeholder row
      const fetchedKeys = new Set(fetched.map(s => s.key));
      const merged: Setting[] = [...fetched];
      for (const sug of SUGGESTED_KEYS) {
        if (!fetchedKeys.has(sug.key)) {
          merged.push({ key: sug.key, value: sug.defaultValue, category: sug.category, description: sug.description });
        }
      }
      merged.sort((a, b) => (a.category + a.key).localeCompare(b.category + b.key));
      setSettings(merged);
      setOriginal(typeof structuredClone === 'function' ? structuredClone(merged) : JSON.parse(JSON.stringify(merged)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateValue = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const addCustomSetting = () => {
    const key = prompt('Setting key (snake_case, e.g. "low_stock_threshold"):');
    if (!key || !/^[a-z][a-z0-9_]*$/.test(key)) {
      if (key) toast.error('Invalid key — use snake_case lowercase letters, numbers, and underscores only.');
      return;
    }
    if (settings.some(s => s.key === key)) {
      toast.error('A setting with that key already exists.');
      return;
    }
    setSettings(prev => [...prev, { key, value: '', category: activeCategory, description: null }]);
  };

  const removeSetting = (key: string) => {
    if (!confirm(`Remove setting "${key}"? It won't be deleted from the database — you'll need to delete it directly. This only removes it from the editor.`)) return;
    setSettings(prev => prev.filter(s => s.key !== key));
  };

  // QA C40-C53: well-known typed keys get format validation before save so
  // garbage like an unparseable percentage or "abc" in a numeric field never
  // reaches the DB. Unknown keys pass through unchanged.
  const validateSetting = (key: string, value: string): string | null => {
    const trimmed = value.trim();
    const isPercent = /(_rate|_percent|_percentage)$/.test(key) || key === 'tax_rate' || key === 'service_charge_rate';
    const isEmailKey = /(_email)$/.test(key) || key === 'restaurant_email';
    const isPhoneKey = /(_phone)$/.test(key) || key === 'restaurant_phone';
    const isCurrencyCode = key === 'currency';
    const isTimezone = key === 'timezone';
    const isNumericKey = ['loyalty_points_per_dollar', 'loyalty_min_spend', 'loyalty_points_value', 'low_stock_threshold'].includes(key);

    if (isPercent && trimmed) {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0 || n > 100) return `${key} must be a percent between 0 and 100`;
    }
    if (isEmailKey && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return `${key} is not a valid email address`;
    }
    if (isPhoneKey && trimmed && !/^\+?[0-9 ()-]{7,20}$/.test(trimmed)) {
      return `${key} is not a valid phone number`;
    }
    if (isCurrencyCode && trimmed && !/^[A-Z]{3}$/.test(trimmed)) {
      return `${key} must be a 3-letter ISO code (e.g. USD, PKR, EUR)`;
    }
    if (isTimezone && trimmed) {
      try { new Intl.DateTimeFormat('en', { timeZone: trimmed }); }
      catch { return `${key} is not a valid IANA timezone`; }
    }
    if (isNumericKey && trimmed) {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) return `${key} must be a non-negative number`;
    }
    return null;
  };

  const saveSettings = async () => {
    const changed = settings.filter(s => {
      const orig = original.find(o => o.key === s.key);
      return !orig || orig.value !== s.value;
    });
    if (changed.length === 0) {
      setSuccessMsg('No changes to save');
      setTimeout(() => setSuccessMsg(null), 2000);
      return;
    }

    // QA C40-C53: validate before sending. First failure short-circuits.
    for (const s of changed) {
      const err = validateSetting(s.key, s.value);
      if (err) {
        setError(err);
        toast.error(err);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/settings/bulk-sync', {
        settings: changed.map(s => ({ key: s.key, value: s.value.trim(), category: s.category })),
      });
      // QA C40: structuredClone preserves Dates and is faster than JSON round-trip
      // (and it's natively supported in modern browsers / Node 17+).
      setOriginal(typeof structuredClone === 'function' ? structuredClone(settings) : JSON.parse(JSON.stringify(settings)));
      setSuccessMsg(`Saved ${changed.length} setting${changed.length === 1 ? '' : 's'}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const categories = Array.from(new Set([...settings.map(s => s.category), ...Object.keys(CATEGORY_LABELS)])).sort();
  const categorySettings = settings.filter(s => s.category === activeCategory);
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  const formatLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Settings className="text-red-600" /> Settings
          </h1>
          <p className="text-gray-500 mt-1">Configure your restaurant system. All settings are stored as key-value pairs.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={saveSettings} disabled={saving || !hasChanges} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3">
          <Check size={20} /> {successMsg}
        </div>
      )}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-2xl text-sm font-medium">
          You have unsaved changes. Click "Save Changes" to apply.
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeCategory === cat ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-700 flex items-center justify-between">
            <h2 className="font-extrabold text-gray-900">{CATEGORY_LABELS[activeCategory] || activeCategory}</h2>
            <button onClick={addCustomSetting} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors">
              <Plus size={14} /> Add Setting
            </button>
          </div>

          {categorySettings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Settings size={32} className="mb-2 text-gray-200" />
              <p className="text-sm font-medium">No settings in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {categorySettings.map(setting => {
                const isChanged = original.find(o => o.key === setting.key)?.value !== setting.value;
                return (
                  <div key={setting.key} className={`px-5 py-4 flex items-start gap-4 ${isChanged ? 'bg-blue-50/40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{formatLabel(setting.key)}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{setting.key}</p>
                      {setting.description && <p className="text-xs text-gray-500 mt-1">{setting.description}</p>}
                    </div>
                    <input
                      value={setting.value}
                      onChange={e => updateValue(setting.key, e.target.value)}
                      className="w-64 px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none text-sm"
                    />
                    <button onClick={() => removeSetting(setting.key)} title="Remove from editor"
                      className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Settings are stored in the database as key-value pairs. Removing a row only takes it out of the editor — it does not delete it from the database.
      </p>
    </div>
  );
}
