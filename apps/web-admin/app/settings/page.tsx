'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import apiClient from '../lib/api';

const TABS = ['general', 'business', 'payment', 'notifications'] as const;
type Tab = typeof TABS[number];

interface SettingsData {
  restaurantName?: string;
  tagline?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  taxRate?: number;
  serviceCharge?: number;
  acceptCash?: boolean;
  acceptCard?: boolean;
  acceptMobileWallet?: boolean;
  splitPaymentEnabled?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  lowStockThreshold?: number;
  fiscalYearStart?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

const DEFAULTS: SettingsData = {
  restaurantName: '',
  tagline: '',
  timezone: 'UTC',
  language: 'en',
  currency: 'USD',
  taxRate: 0,
  serviceCharge: 0,
  acceptCash: true,
  acceptCard: true,
  acceptMobileWallet: false,
  splitPaymentEnabled: false,
  emailNotifications: true,
  smsNotifications: false,
  lowStockThreshold: 10,
  fiscalYearStart: 'January',
  address: '',
  phone: '',
  email: '',
  website: '',
};

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Karachi', 'Asia/Dubai'];
const CURRENCIES = ['USD', 'PKR', 'EUR', 'GBP', 'AED', 'CAD', 'AUD'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<SettingsData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/settings');
      setSettings({ ...DEFAULTS, ...(res.data?.data?.settings || {}) });
    } catch {
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      await apiClient.put('/settings', settings);
      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof SettingsData, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );

  const TextInput = ({ k, placeholder = '' }: { k: keyof SettingsData; placeholder?: string }) => (
    <input type="text" value={(settings[k] as string) || ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
  );

  const NumberInput = ({ k, min = 0, step = 0.01 }: { k: keyof SettingsData; min?: number; step?: number }) => (
    <input type="number" min={min} step={step} value={(settings[k] as number) || 0} onChange={e => set(k, parseFloat(e.target.value) || 0)}
      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
  );

  const Toggle = ({ k, label }: { k: keyof SettingsData; label: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="font-medium text-gray-700">{label}</span>
      <button onClick={() => set(k, !settings[k])}
        className={`relative w-11 h-6 rounded-full transition-colors ${settings[k] ? 'bg-red-500' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[k] ? 'translate-x-5 left-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Settings className="text-red-600" /> Settings
          </h1>
          <p className="text-gray-500 mt-1">Configure your restaurant system</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            Save Settings
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          {activeTab === 'general' && (
            <>
              <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-4">General Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Restaurant Name"><TextInput k="restaurantName" placeholder="My Restaurant" /></Field>
                <Field label="Tagline"><TextInput k="tagline" placeholder="Great food, great service" /></Field>
                <Field label="Timezone">
                  <select value={settings.timezone || 'UTC'} onChange={e => set('timezone', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none">
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </Field>
                <Field label="Currency">
                  <select value={settings.currency || 'USD'} onChange={e => set('currency', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Fiscal Year Start">
                  <select value={settings.fiscalYearStart || 'January'} onChange={e => set('fiscalYearStart', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none">
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Low Stock Threshold"><NumberInput k="lowStockThreshold" min={0} step={1} /></Field>
              </div>
            </>
          )}

          {activeTab === 'business' && (
            <>
              <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-4">Business Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Address"><TextInput k="address" placeholder="123 Main St, City" /></Field>
                <Field label="Phone"><TextInput k="phone" placeholder="+1 555 0000" /></Field>
                <Field label="Email"><TextInput k="email" placeholder="info@restaurant.com" /></Field>
                <Field label="Website"><TextInput k="website" placeholder="https://restaurant.com" /></Field>
                <Field label="Tax Rate (%)"><NumberInput k="taxRate" /></Field>
                <Field label="Service Charge (%)"><NumberInput k="serviceCharge" /></Field>
              </div>
            </>
          )}

          {activeTab === 'payment' && (
            <>
              <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-4">Payment Methods</h2>
              <div className="space-y-1">
                <Toggle k="acceptCash" label="Accept Cash Payments" />
                <Toggle k="acceptCard" label="Accept Card Payments" />
                <Toggle k="acceptMobileWallet" label="Accept Mobile Wallet" />
                <Toggle k="splitPaymentEnabled" label="Allow Split Payments" />
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-4">Notifications</h2>
              <div className="space-y-1">
                <Toggle k="emailNotifications" label="Email Notifications" />
                <Toggle k="smsNotifications" label="SMS Notifications" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
