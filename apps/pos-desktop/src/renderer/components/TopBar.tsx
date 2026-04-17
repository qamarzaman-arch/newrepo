import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Clock, User } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const routeTitles: Record<string, string> = {
  '/pos': 'Point of Sale',
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/kitchen': 'Kitchen Display',
  '/tables': 'Table Management',
  '/menu': 'Menu Management',
  '/customers': 'Customers',
  '/inventory': 'Inventory',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
};

const TopBar: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    <header className="bg-surface-lowest border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Page info */}
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Workspace
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {getPageTitle()}
          </h2>
        </div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-4">
          {/* Online/Offline status */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-semibold">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-semibold">Offline</span>
              </>
            )}
          </div>

          {/* Clock */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
            <Clock className="w-4 h-4 text-gray-600" />
            <div className="text-sm">
              <p className="font-semibold text-gray-900">{formatTime(currentTime)}</p>
              <p className="text-xs text-gray-600">{formatDate(currentTime)}</p>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-600">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
