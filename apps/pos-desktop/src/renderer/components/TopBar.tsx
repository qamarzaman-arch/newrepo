import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, Clock, User, Bell, Search, Globe, ChevronDown, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const routeTitles: Record<string, string> = {
  '/pos': 'Point of Sale',
  '/dashboard': 'Executive Overview',
  '/orders': 'Ledger Explorer',
  '/kitchen': 'Kitchen Terminal',
  '/tables': 'Floor Intelligence',
  '/menu': 'Catalog Architect',
  '/customers': 'CRM Insights',
  '/inventory': 'Supply Chain',
  '/reports': 'Financial Intelligence',
  '/settings': 'System Configuration',
  '/vendors': 'Vendor Network',
  '/staff': 'Human Capital',
};

const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPageTitle = () => routeTitles[location.pathname] || 'Enterprise OS';

  return (
    <header className="bg-white border-b border-gray-100 px-10 py-6 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div className="hidden lg:flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 w-80 group focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5 transition-all">
              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input type="text" placeholder="Global Search..." className="bg-transparent border-none outline-none text-sm font-bold text-gray-900 w-full" />
           </div>
           <div className="h-10 w-[2px] bg-gray-100 hidden lg:block" />
           <div>
             <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">{getPageTitle()}</h2>
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isOnline ? 'Network Synchronized' : 'Offline Mode'}</span>
             </div>
           </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="hidden md:flex items-center gap-3 px-6 py-2.5 bg-gray-50 rounded-2xl border border-gray-100">
              <Clock className="w-4 h-4 text-gray-400" />
              <div className="text-right">
                 <p className="text-xs font-black text-gray-900">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
              </div>
           </div>

           <button className="p-3 bg-gray-50 text-gray-400 hover:text-primary hover:bg-white hover:shadow-lg rounded-2xl transition-all relative group">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
           </button>

           <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 pr-4 bg-gray-950 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
              >
                 <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-xs border border-white/10">
                    {user?.fullName?.charAt(0) || 'A'}
                 </div>
                 <div className="text-left hidden sm:block">
                    <p className="text-xs font-black tracking-tight">{user?.fullName}</p>
                    <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest">{user?.role}</p>
                 </div>
                 <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                    >
                       <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                          <p className="font-black text-gray-900 truncate">{user?.email || user?.username}</p>
                       </div>
                       <div className="p-2">
                          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                             <User className="w-4 h-4" /> Profile Settings
                          </button>
                          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all" onClick={() => { logout(); navigate('/login'); }}>
                             <LogOut className="w-4 h-4" /> Security Sign-out
                          </button>
                       </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
