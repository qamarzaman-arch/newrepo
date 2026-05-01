import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Users,
  ChefHat,
  TableProperties,
  Package,
  UtensilsCrossed,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Clock,
  User,
  Truck,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeatureAccessStore } from '../stores/featureAccessStore';

// Admin/Manager Navigation — kept aligned with the web-admin sidebar so the
// experience is consistent across desktop and web.
const adminMenuItems = [
  { icon: LayoutDashboard,  label: 'Dashboard',             path: '/dashboard',      feature: null },
  { icon: ShoppingCart,     label: 'Orders',                path: '/orders',         feature: 'orders' },
  { icon: ChefHat,          label: 'Kitchen Display',       path: '/kitchen',        feature: 'kitchen' },
  { icon: TableProperties,  label: 'Tables & Reservations', path: '/tables',         feature: 'tables' },
  { icon: Truck,            label: 'Delivery',              path: '/delivery',       feature: 'delivery' },
  { icon: UtensilsCrossed,  label: 'Menu Management',       path: '/menu',           feature: 'menu' },
  { icon: Package,          label: 'Inventory Control',     path: '/inventory',      feature: 'inventory' },
  { icon: Briefcase,        label: 'Vendor Management',     path: '/vendors',        feature: 'vendors' },
  { icon: Users,            label: 'Customer CRM',          path: '/customers',      feature: 'customers' },
  { icon: BarChart3,        label: 'Staff Management',      path: '/staff',          feature: 'staff' },
  { icon: Clock,            label: 'Attendance',            path: '/attendance',     feature: 'attendance' },
  { icon: DollarSign,       label: 'Financial',             path: '/financial',      feature: 'financial' },
  { icon: Shield,           label: 'Feature Access',        path: '/feature-access', feature: null },
  { icon: Settings,         label: 'Settings',              path: '/settings',       feature: 'settings' },
];

// Kitchen Staff Navigation
const kitchenMenuItems = [
  { icon: ChefHat, label: 'Kitchen Display', path: '/kitchen', feature: 'kitchen' },
  { icon: ShoppingCart, label: 'Order Queue', path: '/orders?tab=active', feature: 'orders' },
];

// Delivery Rider Navigation
const riderMenuItems = [
  { icon: ShoppingCart, label: 'Deliveries', path: '/delivery', feature: 'delivery' },
  { icon: History, label: 'Delivery History', path: '/delivery?tab=history', feature: 'delivery' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { hasAccess } = useFeatureAccessStore();

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

  // Filter menu items based on feature access
  const filteredMenuItems = menuItems.filter(item => {
    // If item has no feature (like Dashboard, Feature Access), always show it
    if (!item.feature) return true;
    // Otherwise check if user has access to that feature
    return hasAccess(item.feature);
  });

  return (
    <aside className="w-72 bg-gradient-to-b from-primary-600 via-primary-700 to-primary-800 text-white flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-primary-500/10">
        <Link to={user?.role === 'CASHIER' ? '/cashier-pos' : '/dashboard'} className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-primary-600/30 backdrop-blur-sm rounded-2xl p-3 shadow-lg"
          >
            <img src="/assets/logo.png" alt="POSLytic" className="h-10 w-auto" />
          </motion.div>
          <div>
            <motion.h1
              className="text-2xl font-bold font-display bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent"
              whileHover={{ scale: 1.05 }}
            >
              POSLytic
            </motion.h1>
            <motion.p
              className="text-xs text-white/70 font-medium"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Smart Management
            </motion.p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-6 py-5 border-b border-primary-500/10 bg-primary-900/20">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-10 h-10 rounded-full bg-primary-600/30 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hello, {user?.fullName}!</p>
            <p className="text-xs text-white/60 mt-0.5">{user?.role}</p>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredMenuItems.map((item, index) => {
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
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                  isActive
                    ? 'bg-white text-primary-700 font-semibold shadow-xl shadow-primary-500/20'
                    : 'text-white/80 hover:bg-primary-600/30 hover:text-white hover:shadow-lg'
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${isActive ? 'text-primary-600' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-0 w-1 h-8 bg-primary-500 rounded-l-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/10 to-transparent ${
                    isActive ? 'from-transparent via-primary-500/10 to-transparent' : ''
                  }`}
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
      <div className="p-4 border-t border-primary-500/10 bg-primary-900/20">
        <motion.button
          onClick={logout}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.8)' }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600/30 backdrop-blur-sm rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl"
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
