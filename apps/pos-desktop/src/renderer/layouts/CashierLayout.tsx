import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';
import { LogOut, HelpCircle, Clock, ShoppingCart, History, Settings, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface CashierLayoutProps {
  children: React.ReactNode;
}

const CashierLayout: React.FC<CashierLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Cashier-specific menu items
  const cashierMenuItems = [
    { icon: LayoutDashboard, label: 'POS Terminal', path: '/cashier-pos' },
    { icon: ShoppingCart, label: 'Orders', path: '/orders' },
    { icon: History, label: 'Order History', path: '/orders?tab=history' },
    { icon: Clock, label: 'Shift Summary', path: '/shift-summary' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Expanded Sidebar for Cashiers */}
      <aside className="w-64 bg-gradient-to-b from-primary to-primary-container flex flex-col shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/cashier-pos" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-white/20 rounded-xl p-2"
            >
              <span className="text-white font-black text-xl">P</span>
            </motion.div>
            <div>
              <motion.h1 
                className="text-lg font-bold text-white"
                whileHover={{ scale: 1.05 }}
              >
                POSLytic
              </motion.h1>
              <p className="text-xs text-white/70">Cashier Mode</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">Hello, {user?.fullName || 'Cashier'}!</p>
          <p className="text-xs text-white/70 mt-1 capitalize">{user?.role?.toLowerCase()}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {cashierMenuItems.map((item, index) => {
            const isActive = location.pathname === item.path.split('?')[0];
            const Icon = item.icon;

            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold shadow-lg'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-0 w-1 h-6 bg-accent rounded-l-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
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
