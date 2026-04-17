import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, HelpCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface CashierLayoutProps {
  children: React.ReactNode;
}

const CashierLayout: React.FC<CashierLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Minimal Sidebar for Cashiers */}
      <aside className="w-20 bg-gradient-to-b from-primary to-primary-container flex flex-col items-center py-6 shadow-lg">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-black text-xl">P</span>
          </div>
        </div>

        {/* Quick Actions */}
        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/cashier-pos')}
            className="w-full aspect-square rounded-xl bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            title="POS Terminal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/orders?tab=active')}
            className="w-full aspect-square rounded-xl bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Active Orders"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/customers')}
            className="w-full aspect-square rounded-xl bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Quick Lookup"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full aspect-square rounded-xl bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Shift Summary"
          >
            <Clock className="w-6 h-6" />
          </motion.button>
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-3 w-full px-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full aspect-square rounded-xl bg-white/10 text-white/80 flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Help & Support"
          >
            <HelpCircle className="w-6 h-6" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="w-full aspect-square rounded-xl bg-red-500/20 text-red-200 flex items-center justify-center hover:bg-red-500/30 transition-colors"
            title="Logout"
          >
            <LogOut className="w-6 h-6" />
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Minimal Top Bar for Cashiers */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="font-manrope text-xl font-bold text-gray-900">POSLytic</h1>
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full">Cashier Mode</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.fullName || 'Cashier'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.fullName?.charAt(0) || 'C'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default CashierLayout;
