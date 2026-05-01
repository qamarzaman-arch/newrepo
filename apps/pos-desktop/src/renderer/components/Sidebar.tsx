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
import logoUrl from '../assets/logo.png';

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
    <aside className="w-72 text-white flex flex-col" style={{ backgroundColor: '#AA0000' }}>
      {/* Logo */}
      <div className="p-6 border-b border-white/15">
        <Link to={user?.role === 'CASHIER' ? '/cashier-pos' : '/dashboard'} className="flex items-center gap-3 group">
          <div className="rounded-2xl p-1">
            <img
              src={logoUrl}
              alt="POSLytic"
              className="h-12 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-wide text-white">
              POSLYTIC
            </h1>
            <p className="text-xs text-white/80 font-medium">
              Smart Management
            </p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="px-6 py-5 border-b border-white/15" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hello, {user?.fullName}!</p>
            <p className="text-xs text-white/70 mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredMenuItems.map((item) => {
          const isActive = location.pathname === item.path.split('?')[0];
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150"
              style={
                isActive
                  ? { backgroundColor: '#FFFFFF', color: '#AA0000', fontWeight: 600 }
                  : { color: '#FBFBFB' }
              }
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/15" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors font-semibold"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#FBFBFB' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.20)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
