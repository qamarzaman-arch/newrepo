import React from 'react';
import { Store, CreditCard, Printer, Users, Wifi } from 'lucide-react';

const SettingsScreen: React.FC = () => {
  const settingsSections = [
    {
      title: 'General Settings',
      icon: Store,
      items: [
        { label: 'Restaurant Name', value: 'Restaurant OS', type: 'text' },
        { label: 'Address', value: '123 Main St', type: 'text' },
        { label: 'Phone', value: '+1 234 567 8900', type: 'text' },
        { label: 'Currency', value: 'USD', type: 'select' },
      ],
    },
    {
      title: 'Payment Settings',
      icon: CreditCard,
      items: [
        { label: 'Accept Cash', value: true, type: 'toggle' },
        { label: 'Accept Card', value: true, type: 'toggle' },
        { label: 'Accept Mobile Wallet', value: true, type: 'toggle' },
      ],
    },
    {
      title: 'Kitchen Settings',
      icon: Printer,
      items: [
        { label: 'Auto-print KOT', value: true, type: 'toggle' },
        { label: 'Print Delay Threshold (min)', value: '15', type: 'number' },
      ],
    },
    {
      title: 'Staff Management',
      icon: Users,
      items: [
        { label: 'Total Staff', value: '12', type: 'info' },
        { label: 'Active Shifts', value: '5', type: 'info' },
      ],
    },
    {
      title: 'Device Settings',
      icon: Wifi,
      items: [
        { label: 'POS Terminal ID', value: 'POS-001', type: 'text' },
        { label: 'Backend URL', value: 'http://localhost:3001', type: 'text' },
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
                        defaultValue={String(item.value)}
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
        <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
          Reset to Defaults
        </button>
        <button className="px-6 py-3 gradient-btn rounded-xl font-semibold">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;
