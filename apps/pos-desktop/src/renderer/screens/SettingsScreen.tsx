import React, { useState } from 'react';
import { Store, CreditCard, Printer } from 'lucide-react';
import { useSettingsStore, AppSettings } from '../stores/settingsStore';
import toast from 'react-hot-toast';

const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });

  const handleToggle = (key: string) => {
    setLocalSettings({
      ...localSettings,
      [key]: !localSettings[key as keyof typeof localSettings],
    } as AppSettings);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setLocalSettings(useSettingsStore.getState().settings);
      toast.success('Settings reset to defaults');
    }
  };

  const settingsSections = [
    {
      title: 'General Settings',
      icon: Store,
      items: [
        { label: 'Restaurant Name', key: 'restaurantName', value: localSettings.restaurantName, type: 'text' },
        { label: 'Currency', key: 'currency', value: localSettings.currency, type: 'text' },
      ],
    },
    {
      title: 'Payment Settings',
      icon: CreditCard,
      items: [
        { label: 'Accept Cash', key: 'acceptCash', value: localSettings.acceptCash, type: 'toggle' },
        { label: 'Accept Card', key: 'acceptCard', value: localSettings.acceptCard, type: 'toggle' },
        { label: 'Accept Mobile Wallet', key: 'acceptMobileWallet', value: localSettings.acceptMobileWallet, type: 'toggle' },
      ],
    },
    {
      title: 'Tax Settings',
      icon: CreditCard,
      items: [
        { label: 'Tax Rate (%)', key: 'taxRate', value: localSettings.taxRate, type: 'number' },
      ],
    },
    {
      title: 'Kitchen Settings',
      icon: Printer,
      items: [
        { label: 'Auto-print KOT', key: 'autoPrintKOT', value: localSettings.autoPrintKOT, type: 'toggle' },
        { label: 'Auto-print Receipt', key: 'autoPrintReceipt', value: localSettings.autoPrintReceipt, type: 'toggle' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div key={index} className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">{item.label}</label>
                    {item.type === 'toggle' ? (
                      <div
                        onClick={() => item.key && handleToggle(item.key)}
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          item.value ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-1'
                          } mt-0.5`}
                        ></div>
                      </div>
                    ) : item.type === 'info' ? (
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    ) : (
                      <input
                        type={item.type}
                        value={String(item.value)}
                        onChange={(e) => setLocalSettings({ ...localSettings, [item.key!]: e.target.value } as AppSettings)}
                        className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none w-48"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-4">
        <button onClick={handleReset} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
          Reset to Defaults
        </button>
        <button onClick={handleSave} className="px-6 py-3 gradient-btn rounded-xl font-semibold">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;