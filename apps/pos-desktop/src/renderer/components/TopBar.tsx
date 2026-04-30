import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Clock, User, Bell } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/kitchen': 'Kitchen Display',
  '/tables': 'Tables & Reservations',
  '/menu': 'Menu Management',
  '/customers': 'Customer CRM',
  '/inventory': 'Inventory Control',
  '/settings': 'System Settings',
  '/staff': 'Staff Management',
  '/vendors': 'Vendor Management',
  '/delivery': 'Delivery Management',
  '/financial': 'Financial Management',
  '/feature-access': 'Feature Access Control',
  '/attendance': 'Staff Attendance',
  '/staff-attendance': 'Staff Attendance',
  '/cashier-pos': 'Point of Sale',
  '/cashier-orders': 'Active Orders',
  '/cashier-history': 'Order History',
  '/cashier-tables': 'Tables',
  '/shift-summary': 'Shift Summary',
  '/rider': 'Rider Dashboard',
  '/rider-deliveries': 'My Deliveries',
  '/rider-history': 'Delivery History',
};

const TopBar: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: lowStockItems } = useQuery({
    queryKey: ['topbar-low-stock'],
    queryFn: async () => {
      const response = await inventoryService.getInventory({ lowStock: true });
      return response.data.data.items || [];
    },
    refetchInterval: 120000,
    enabled: user?.role === 'ADMIN' || user?.role === 'MANAGER',
  });

  const alertCount = (lowStockItems?.length ?? 0);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPageTitle = () => {
    return routeTitles[location.pathname] || 'Restaurant OS';
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-neutral-0 border-b-2 border-primary-200 px-6 py-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        {/* Left side - Page info */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider">
            Workspace
          </p>
          <motion.h2 
            className="text-2xl font-bold text-neutral-900 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {getPageTitle()}
          </motion.h2>
        </motion.div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-4">
          {/* Online/Offline status */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md ${
              isOnline 
                ? 'bg-success-100 text-success-700 border border-success-200' 
                : 'bg-error-100 text-error-700 border border-error-200'
            }`}
          >
            <motion.div
              animate={{ rotate: isOnline ? 0 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </motion.div>
            <span className="text-sm font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
          </motion.div>

          {/* Clock */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full border border-neutral-200 shadow-sm"
          >
            <Clock className="w-4 h-4 text-primary-600" />
            <div className="text-sm">
              <p className="font-semibold text-neutral-900">{formatTime(currentTime)}</p>
              <p className="text-xs text-neutral-600">{formatDate(currentTime)}</p>
            </div>
          </motion.div>

          {/* Notification bell — shows low-stock alert count */}
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (alertCount > 0) {
                window.dispatchEvent(new CustomEvent('navigate', { detail: '/inventory' }));
                import('react-hot-toast').then(({ default: toast }) => {
                  toast(`${alertCount} item${alertCount > 1 ? 's' : ''} need restocking`, { icon: '⚠️' });
                });
              }
            }}
            aria-label={alertCount > 0 ? `${alertCount} alerts` : 'No alerts'}
            className="relative p-2 bg-primary-50 rounded-full border border-primary-200 hover:bg-primary-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-primary-600" />
            {alertCount > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center px-0.5"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {alertCount > 9 ? '9+' : alertCount}
              </motion.span>
            )}
          </motion.button>

          {/* User info */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-full border border-primary-200 shadow-md"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{user?.fullName}</p>
              <p className="text-xs text-primary-700">{user?.role}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};

export default TopBar;
