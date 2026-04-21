import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store,
  CreditCard,
  Printer,
  Shield,
  Bell,
  Monitor,
  Palette,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  Globe,
  Clock,
  Lock,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useSettingsStore, AppSettings } from '../stores/settingsStore';
import { settingService } from '../services/settingsService';
import toast from 'react-hot-toast';

const AdvancedSettingsScreen: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'kitchen' | 'hardware' | 'notifications' | 'security' | 'appearance'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await settingService.getAll();
      if (response.data.success) {
        const dbSettings = response.data.data.settings;
        const mergedSettings = { ...settings };

        dbSettings.forEach((s: any) => {
          if (s.key in mergedSettings) {
            let val: any = s.value;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(Number(val)) && typeof mergedSettings[s.key as keyof AppSettings] === 'number') {
                val = Number(val);
            }
            (mergedSettings as any)[s.key] = val;
          }
        });

        updateSettings(mergedSettings);
        setLocalSettings(mergedSettings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      updateSettings(localSettings);
      await settingService.bulkUpdate(localSettings);
      toast.success('Enterprise configuration synchronized');
    } catch (error) {
      toast.error('Sync failed. Settings saved locally.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Business Profile', icon: Store },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'kitchen', label: 'Kitchen Workflow', icon: Printer },
    { id: 'security', label: 'Access Control', icon: ShieldAlert },
    { id: 'appearance', label: 'Brand & UI', icon: Palette },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
         <Loader2 className="w-16 h-16 text-primary animate-spin" />
         <p className="text-xl font-black text-gray-400 uppercase tracking-tighter italic">Initializing Enterprise Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Shield className="w-6 h-6" /></div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Configuration</h1>
           </div>
           <p className="text-gray-500 font-medium italic">Advanced enterprise controls and localized business settings</p>
        </div>
        <div className="flex gap-4">
           <button
             onClick={handleSave}
             disabled={isSaving}
             className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
           >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Syncing...' : 'Apply Enterprise Policy'}
           </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
         {/* Sidebar Tabs */}
         <nav className="w-full lg:w-80 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white shadow-2xl scale-[1.02] border-none'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`p-3 rounded-2xl ${activeTab === tab.id ? 'bg-white/10' : 'bg-gray-50'}`}>
                   <tab.icon className="w-5 h-5" />
                </div>
                <span className="font-black uppercase text-xs tracking-widest">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
         </nav>

         {/* Content Area */}
         <div className="flex-1 bg-white rounded-[3rem] shadow-sm border border-gray-100 p-10 min-h-[600px]">
            <AnimatePresence mode="wait">
               <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-10"
               >
                  {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="col-span-2 border-b border-gray-100 pb-6">
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Corporate Identity</h3>
                          <p className="text-gray-400 text-sm italic">Define how your brand appears across receipts and digital interfaces</p>
                       </div>
                       {[
                         { label: 'Brand Name', key: 'restaurantName' },
                         { label: 'Service Address', key: 'address' },
                         { label: 'Support Phone', key: 'phone' },
                         { label: 'Marketing Tagline', key: 'tagline' },
                       ].map(field => (
                         <div key={field.key} className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                            <input
                              type="text"
                              value={(localSettings as any)[field.key]}
                              onChange={(e) => setLocalSettings({...localSettings, [field.key]: e.target.value})}
                              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                            />
                         </div>
                       ))}
                    </div>
                  )}

                  {activeTab === 'payment' && (
                    <div className="space-y-8">
                       <div className="border-b border-gray-100 pb-6">
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Finance & Taxes</h3>
                          <p className="text-gray-400 text-sm italic">Global tax policies and gateway configurations</p>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {[
                            { label: 'Standard VAT Rate (%)', key: 'taxRate', type: 'number' },
                            { label: 'Service Charge (%)', key: 'serviceCharge', type: 'number' },
                          ].map(field => (
                            <div key={field.key} className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                               <input
                                 type="number"
                                 value={(localSettings as any)[field.key]}
                                 onChange={(e) => setLocalSettings({...localSettings, [field.key]: Number(e.target.value)})}
                                 className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                               />
                            </div>
                          ))}
                       </div>

                       <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2.5rem] flex items-start gap-6">
                          <div className="p-4 bg-white rounded-3xl shadow-sm text-blue-600"><Globe className="w-8 h-8" /></div>
                          <div>
                             <h4 className="font-black text-blue-900 uppercase tracking-tight mb-2">Multi-Currency Engine</h4>
                             <p className="text-blue-700 text-sm font-medium leading-relaxed">The system is currently configured for <b>{localSettings.currency}</b>. Foreign exchange rates are calculated at the end of each fiscal cycle based on the central bank's published indices.</p>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-8">
                        <div className="border-b border-gray-100 pb-6">
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Access Control</h3>
                          <p className="text-gray-400 text-sm italic">Secure sensitive operations with multi-level authorizations</p>
                       </div>

                       <div className="grid grid-cols-1 gap-4">
                          {[
                            { label: 'Require PIN for Voids', key: 'requirePinForVoid', desc: 'Prevents unauthorized item removal after printing' },
                            { label: 'Require PIN for Refunds', key: 'requirePinForRefund', desc: 'Critical security for cash flow management' },
                            { label: 'Two-Factor Auth', key: 'twoFactorAuth', desc: 'Add secondary login layer for manager accounts' },
                          ].map(opt => (
                            <div key={opt.key} className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                               <div>
                                  <p className="font-black text-gray-900 uppercase tracking-tight text-sm">{opt.label}</p>
                                  <p className="text-xs text-gray-500 font-medium italic">{opt.desc}</p>
                               </div>
                               <button
                                 onClick={() => setLocalSettings({...localSettings, [opt.key]: !(localSettings as any)[opt.key]})}
                                 className={`w-14 h-8 rounded-full relative transition-all ${(localSettings as any)[opt.key] ? 'bg-primary' : 'bg-gray-300'}`}
                               >
                                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${(localSettings as any)[opt.key] ? 'left-7' : 'left-1'}`} />
                               </button>
                            </div>
                          ))}
                       </div>

                       <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] flex items-start gap-6 mt-10">
                          <div className="p-4 bg-white rounded-3xl shadow-sm text-red-600"><Lock className="w-8 h-8" /></div>
                          <div>
                             <h4 className="font-black text-red-900 uppercase tracking-tight mb-2">Manager Master PIN</h4>
                             <p className="text-red-700 text-sm font-medium mb-4">Ensure this PIN is kept strictly confidential. It overrides all terminal restrictions.</p>
                             <input
                               type="password"
                               value={localSettings.managerPin}
                               onChange={(e) => setLocalSettings({...localSettings, managerPin: e.target.value})}
                               className="px-6 py-3 bg-white border border-red-200 rounded-xl font-mono text-xl tracking-widest outline-none focus:ring-4 focus:ring-red-200/20"
                             />
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (
                    <div className="space-y-8">
                        <div className="border-b border-gray-100 pb-6">
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">User Experience</h3>
                          <p className="text-gray-400 text-sm italic">Tailor the interface to your environment's lighting and speed</p>
                       </div>

                       <div className="grid grid-cols-3 gap-6">
                          {['light', 'dark', 'auto'].map(theme => (
                            <button
                              key={theme}
                              onClick={() => setLocalSettings({...localSettings, theme: theme as any})}
                              className={`p-8 rounded-[2.5rem] border-4 transition-all ${localSettings.theme === theme ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-100'}`}
                            >
                               <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 shadow-inner ${theme === 'light' ? 'bg-white' : theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-white to-gray-900'}`} />
                               <span className="font-black uppercase text-[10px] tracking-widest">{theme}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}
               </motion.div>
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};

export default AdvancedSettingsScreen;
