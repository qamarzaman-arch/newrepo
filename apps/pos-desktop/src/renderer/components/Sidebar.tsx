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

const menuItems = [
  { icon: LayoutDashboard, label: 'POS', path: '/pos', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { icon: ShoppingCart, label: 'Orders', path: '/orders', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { icon: History, label: 'History', path: '/orders?tab=history', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { icon: ChefHat, label: 'Kitchen', path: '/kitchen', roles: ['ADMIN', 'MANAGER', 'KITCHEN'] },
  { icon: Table, label: 'Tables', path: '/tables', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { icon: Package, label: 'Menu', path: '/menu', roles: ['ADMIN', 'MANAGER'] },
  { icon: Users, label: 'Customers', path: '/customers', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { icon: Package, label: 'Inventory', path: '/inventory', roles: ['ADMIN', 'MANAGER'] },
  { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['ADMIN', 'MANAGER'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['ADMIN', 'MANAGER'] },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const filteredMenu = menuItems.filter((item) =>
    user?.role && item.roles.includes(user.role)
  );

  return (
    <aside className="w-72 bg-gradient-to-b from-primary to-primary-container text-white flex flex-col shadow-large">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🍽️</div>
          <div>
            <h1 className="text-xl font-bold font-display">Restaurant OS</h1>
            <p className="text-xs text-white/60">Operations Center</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-white/10">
        <p className="text-sm font-semibold">Hello, {user?.fullName}!</p>
        <p className="text-xs text-white/60 mt-1">Role: {user?.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredMenu.map((item) => {
          const isActive = location.pathname === item.path.split('?')[0];
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
