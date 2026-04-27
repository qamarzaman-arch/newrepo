import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { LogOut, HelpCircle, Clock, ShoppingCart, History, LayoutDashboard, X, Keyboard, Phone, ChevronLeft, ChevronRight, Users, Truck, Bell, Table as TableIcon, ChefHat, Package, BarChart3, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useFeatureAccessStore } from '../stores/featureAccessStore';
import { useCashierWebSocket } from '../hooks/useWebSocket';
import ShiftManager from '../components/ShiftManager';
import toast from 'react-hot-toast';

interface CashierLayoutProps {
  children: React.ReactNode;
}

const CashierLayout: React.FC<CashierLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { hasAccess } = useFeatureAccessStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const [showHelp, setShowHelp] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Cashier-specific menu items with delivery, tables, and attendance
  const cashierMenuItems = [
    { icon: LayoutDashboard, label: 'POS Terminal', path: '/cashier-pos', feature: null },
    { icon: ShoppingCart, label: 'Active Orders', path: '/cashier-orders', feature: 'orders' },
    { icon: TableIcon, label: 'Tables', path: '/cashier-tables', feature: 'tables' },
    { icon: ChefHat, label: 'Kitchen Display', path: '/kitchen', feature: 'kitchen' },
    { icon: Package, label: 'Inventory', path: '/inventory', feature: 'inventory' },
    { icon: Package, label: 'Menu', path: '/menu', feature: 'menu' },
    { icon: Users, label: 'Customers', path: '/customers', feature: 'customers' },
    { icon: BarChart3, label: 'Vendors', path: '/vendors', feature: 'vendors' },
    { icon: Truck, label: 'Deliveries', path: '/delivery', feature: 'delivery' },
    { icon: Users, label: 'Staff Attendance', path: '/staff-attendance', feature: 'staff' },
    { icon: Clock, label: 'Attendance', path: '/attendance', feature: 'attendance' },
    { icon: History, label: 'Order History', path: '/cashier-history', feature: null },
    { icon: Clock, label: 'Shift Summary', path: '/shift-summary', feature: null },
  ];

  // Rider-specific menu items
  const riderMenuItems = [
    { icon: Truck, label: 'My Deliveries', path: '/rider-deliveries', feature: 'delivery' },
    { icon: History, label: 'Delivery History', path: '/rider-history', feature: 'delivery' },
    { icon: Clock, label: 'My Shifts', path: '/shift-summary', feature: null },
  ];

  // Select menu based on user role
  const menuItems = user?.role === 'RIDER' ? riderMenuItems : cashierMenuItems;

  // Filter menu items based on feature access
  const filteredMenuItems = menuItems.filter(item => {
    // If item has no feature, always show it
    if (!item.feature) return true;
    // Otherwise check if user has access to that feature
    const access = hasAccess(item.feature);
    console.log(`Checking access for ${item.label} (feature: ${item.feature}): ${access}`);
    return access;
  });

  console.log('Filtered menu items:', filteredMenuItems);

  // Handle kitchen completion notifications
  const handleKitchenNotification = useCallback((data: any) => {
    const orderNumber = data?.orderNumber || data?.order?.orderNumber || 'Unknown';
    toast.success(
      () => (
        <div className="flex flex-col">
          <span className="font-bold">Order #{orderNumber} Ready!</span>
          <span className="text-sm">Kitchen has completed the order</span>
          <button
            onClick={() => navigate('/cashier-orders')}
            className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            View Orders
          </button>
        </div>
      ),
      {
        duration: 5000,
        icon: <Bell className="w-5 h-5 text-green-500" />,
      }
    );
  }, [navigate]);

  // Subscribe to kitchen notifications
  useCashierWebSocket(handleKitchenNotification);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Collapsible Sidebar for Cashiers */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-primary to-primary-container flex flex-col shadow-lg transition-all duration-300 relative`}>
        {/* Logo */}
        <div className={`p-6 border-b border-white/10 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
          <Link to="/cashier-pos" className={`flex items-center gap-3 group ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-white/20 rounded-xl p-2"
            >
              <span className="text-white font-black text-xl">P</span>
            </motion.div>
            {!isSidebarCollapsed && (
              <div>
                <motion.h1 
                  className="text-lg font-bold text-white"
                  whileHover={{ scale: 1.05 }}
                >
                  POSLytic
                </motion.h1>
                <p className="text-xs text-white/70">Cashier Mode</p>
              </div>
            )}
          </Link>
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white text-primary rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all z-50 border border-gray-200"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* User Info */}
        <div className={`px-6 py-4 border-b border-white/10 ${isSidebarCollapsed ? 'text-center' : ''}`}>
          <p className={`text-sm font-semibold text-white ${isSidebarCollapsed ? 'hidden' : ''}`}>Hello, {user?.fullName || 'Cashier'}!</p>
          <p className={`text-xs text-white/70 mt-1 capitalize ${isSidebarCollapsed ? '' : ''}`}>{isSidebarCollapsed ? user?.fullName?.charAt(0) || 'C' : user?.role?.toLowerCase()}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
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
                  className={`relative flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold shadow-lg'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  {!isSidebarCollapsed && <span className="flex-1">{item.label}</span>}
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

        {/* Bottom Actions - Compact Row Layout */}
        <div className="mt-auto p-3 border-t border-white/10">
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHelp(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors text-sm"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Help</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 transition-colors text-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-medium">Logout</span>
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Main Content - Wrapped with ShiftManager for shift enforcement */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ShiftManager>
          {/* Content Area - No duplicate header, sidebar has all navigation */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </main>
        </ShiftManager>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <HelpCircle className="w-8 h-8 text-primary" />
                  Help & Support
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Keyboard Shortcuts */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Keyboard className="w-4 h-4" />
                    Keyboard Shortcuts
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">New Order</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm font-mono">F1</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Hold Order</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm font-mono">F2</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Toggle Held Orders</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-sm font-mono">F3</kbd>
                    </div>
                  </div>
                </div>

                {/* Contact Support */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Support
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700">For technical assistance, contact your system administrator or call:</p>
                    <p className="text-primary font-bold text-lg mt-2">1-800-POS-HELP</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CashierLayout;
