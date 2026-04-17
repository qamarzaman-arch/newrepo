import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoginScreen from './screens/LoginScreen';
import POSScreen from './screens/POSScreen';
import DashboardScreen from './screens/DashboardScreen';
import AdminDashboard from './screens/AdminDashboard';
import OrdersScreen from './screens/OrdersScreen';
import KitchenScreen from './screens/KitchenScreen';
import TablesScreen from './screens/TablesScreen';
import MenuScreen from './screens/MenuScreen';
import CustomersScreen from './screens/CustomersScreen';
import InventoryScreen from './screens/InventoryScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useAuthStore } from './stores/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect admin/manager to dashboard, others to POS
  const location = window.location.pathname;
  if (location === '/' || location === '') {
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/pos" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
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

// Dashboard wrapper that shows different dashboards based on user role
const DashboardWrapper: React.FC = () => {
  const { user } = useAuthStore();
  
  if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
    return <AdminDashboard />;
  }
  
  return <DashboardScreen />;
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <POSScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute>
              <KitchenScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute>
              <TablesScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <MenuScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <InventoryScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsScreen />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/pos" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Check for existing session on mount
    initialize();
  }, [initialize]);

  return <AnimatedRoutes />;
}

export default App;
