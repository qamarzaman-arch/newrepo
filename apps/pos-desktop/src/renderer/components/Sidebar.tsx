import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Users,
  ChefHat,
  Table,
  Package,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// Admin/Manager Navigation
const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: ChefHat, label: 'Kitchen Display', path: '/kitchen' },
  { icon: Table, label: 'Tables & Reservations', path: '/tables' },
  { icon: Package, label: 'Menu Management', path: '/menu' },
  { icon: Package, label: 'Inventory Control', path: '/inventory' },
  { icon: Users, label: 'Customer CRM', path: '/customers' },
  { icon: BarChart3, label: 'Staff Management', path: '/staff' },
  { icon: BarChart3, label: 'Vendor Management', path: '/vendors' },
  { icon: BarChart3, label: 'Financial Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

// Kitchen Staff Navigation
const kitchenMenuItems = [
  { icon: ChefHat, label: 'Kitchen Display', path: '/kitchen' },
  { icon: ShoppingCart, label: 'Order Queue', path: '/orders?tab=active' },
];

// Delivery Rider Navigation
const riderMenuItems = [
  { icon: ShoppingCart, label: 'Deliveries', path: '/delivery' },
  { icon: History, label: 'Delivery History', path: '/delivery?tab=history' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Select menu based on user role
  let menuItems: typeof adminMenuItems = [];
  
  if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
    menuItems = adminMenuItems;
  } else if (user?.role === 'KITCHEN') {
    menuItems = kitchenMenuItems;
  } else if (user?.role === 'RIDER') {
    menuItems = riderMenuItems;
  }
  // Cashiers use CashierLayout with minimal sidebar

  return (
    <aside className="w-72 bg-gradient-to-b from-primary to-primary-container text-white flex flex-col shadow-large">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link to={user?.role === 'CASHIER' ? '/cashier-pos' : '/dashboard'} className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-white/10 rounded-xl p-2"
          >
            <img src="/assets/logo.svg" alt="POSLytic" className="h-10 w-auto" />
          </motion.div>
          <div>
            <motion.h1 
              className="text-xl font-bold font-display bg-gradient-to-r from-white to-accent bg-clip-text text-transparent"
              whileHover={{ scale: 1.05 }}
            >
              POSLytic
            </motion.h1>
            <p className="text-xs text-white/60">Smart Management</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-white/10">
        <p className="text-sm font-semibold">Hello, {user?.fullName}!</p>
        <p className="text-xs text-white/60 mt-1">Role: {user?.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {menuItems.map((item, index) => {
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
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5 }}
                  style={{ pointerEvents: 'none' }}
                />
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <motion.button
          onClick={logout}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.25)' }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 rounded-xl transition-all font-semibold group"
        >
          <motion.div
            whileHover={{ x: -3 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <LogOut className="w-5 h-5" />
          </motion.div>
          <span>Logout</span>
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;
