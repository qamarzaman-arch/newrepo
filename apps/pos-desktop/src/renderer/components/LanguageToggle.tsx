import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';

const LanguageToggle: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ar', label: 'العربية', flag: '🇦🇪' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white"
      >
        <Globe className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">{settings.language}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-48 bg-gray-900 border border-white/10 rounded-[1.5rem] shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      updateSettings({ language: lang.code });
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      settings.language === lang.code ? 'bg-primary text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag} {lang.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageToggle;
