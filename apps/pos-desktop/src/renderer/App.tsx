import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './screens/LoginScreen';
import POSScreen from './screens/POSScreen';
import CashierPOS from './screens/CashierPOS/AdvancedCashierPOS';
import ShiftSummary from './screens/CashierPOS/ShiftSummary';
import DashboardScreen from './screens/DashboardScreen';
import AdminDashboard from './screens/AdminDashboard';
import OrdersScreen from './screens/AdvancedOrdersScreen';
import KitchenScreen from './screens/AdvancedKitchenScreen';
import TablesScreen from './screens/TablesScreen';
import MenuScreen from './screens/AdvancedMenuScreen';
import CustomersScreen from './screens/AdvancedCustomersScreen';
import InventoryScreen from './screens/AdvancedInventoryScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/AdvancedSettingsScreen';
import StaffScreen from './screens/AdvancedStaffScreen';
import VendorsScreen from './screens/VendorsScreen';
import DeliveryManagementScreen from './screens/DeliveryManagementScreen';
import FinancialManagementScreen from './screens/FinancialManagementScreen';
import AdminLayout from './layouts/AdminLayout';
import CashierLayout from './layouts/CashierLayout';
import KitchenLayout from './layouts/KitchenLayout';
import { useAuthStore } from './stores/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Always redirect based on role
  const location = window.location.pathname;
  
  // Redirect cashiers from old /pos route to new /cashier-pos
  if (location === '/pos' && user.role === 'CASHIER') {
    return <Navigate to="/cashier-pos" replace />;
  }
  
  // Redirect admin/manager to dashboard on root
  if (location === '/' || location === '') {
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/cashier-pos" replace />;
  }

  // Role-based layout rendering
  const renderWithLayout = () => {
    // Kitchen staff get full-screen KDS layout
    if (user.role === 'KITCHEN') {
      return <KitchenLayout>{children}</KitchenLayout>;
    }
    
    // Cashiers get minimal, speed-optimized layout
    if (user.role === 'CASHIER') {
      return <CashierLayout>{children}</CashierLayout>;
    }
    
    // Admin/Manager/Staff get full sidebar layout
    return (
      <AdminLayout>
        {children}
      </AdminLayout>
    );
  };

  return renderWithLayout();
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
          path="/cashier-pos"
          element={
            <ProtectedRoute>
              <CashierPOS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shift-summary"
          element={
            <ProtectedRoute>
              <ShiftSummary />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <ProtectedRoute>
              <VendorsScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute>
              <DeliveryManagementScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial"
          element={
            <ProtectedRoute>
              <FinancialManagementScreen />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/cashier-pos" replace />} />
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
