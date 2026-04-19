import React, { useEffect } from 'react';
import { getHardwareManager } from './services/hardwareManager';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './screens/LoginScreen';
import POSScreen from './screens/POSScreen';
import CashierPOS from './screens/CashierPOS/AdvancedCashierPOS';
import ShiftSummary from './screens/CashierPOS/ShiftSummary';
import CashierOrderHistory from './screens/CashierPOS/CashierOrderHistory';
import CashierActiveOrders from './screens/CashierPOS/CashierActiveOrders';
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
import toast from 'react-hot-toast';

// Role-based route access control
const ALLOWED_ROUTES: Record<string, string[]> = {
  '/orders': ['ADMIN', 'MANAGER', 'STAFF'],
  '/kitchen': ['ADMIN', 'MANAGER', 'KITCHEN'],
  '/tables': ['ADMIN', 'MANAGER', 'STAFF'],
  '/menu': ['ADMIN', 'MANAGER'],
  '/customers': ['ADMIN', 'MANAGER', 'STAFF'],
  '/inventory': ['ADMIN', 'MANAGER'],
  '/reports': ['ADMIN', 'MANAGER'],
  '/settings': ['ADMIN', 'MANAGER'],
  '/staff': ['ADMIN', 'MANAGER'],
  '/vendors': ['ADMIN', 'MANAGER'],
  '/delivery': ['ADMIN', 'MANAGER', 'STAFF'],
  '/financial': ['ADMIN', 'MANAGER'],
  '/dashboard': ['ADMIN', 'MANAGER', 'STAFF'],
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles?: string[] }> = ({ 
  children, 
  requiredRoles 
}) => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentPath = location.pathname;

  // Redirect cashiers from old /pos route to new /cashier-pos
  if (currentPath === '/pos' && user.role === 'CASHIER') {
    return <Navigate to="/cashier-pos" replace />;
  }

  // Redirect kitchen staff from /pos to /kitchen
  if (currentPath === '/pos' && user.role === 'KITCHEN') {
    return <Navigate to="/kitchen" replace />;
  }

  // Redirect admin/manager to dashboard on root
  if (currentPath === '/' || currentPath === '') {
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/cashier-pos" replace />;
  }

  // Check role-based access if requiredRoles provided or path has restrictions
  const allowedRoles = requiredRoles || ALLOWED_ROUTES[currentPath];
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    toast.error('Access denied: Insufficient permissions');
    // Redirect to appropriate dashboard based on role
    if (user.role === 'KITCHEN') return <Navigate to="/kitchen" replace />;
    if (user.role === 'CASHIER') return <Navigate to="/cashier-pos" replace />;
    return <Navigate to="/dashboard" replace />;
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

// Default redirect based on user role
const DefaultRedirect: React.FC = () => {
  const { user } = useAuthStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Admin/Manager go to dashboard
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Kitchen go to kitchen screen
  if (user.role === 'KITCHEN') {
    return <Navigate to="/kitchen" replace />;
  }
  
  // Cashiers go to POS
  return <Navigate to="/cashier-pos" replace />;
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
          path="/cashier-orders"
          element={
            <ProtectedRoute>
              <CashierActiveOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cashier-history"
          element={
            <ProtectedRoute>
              <CashierOrderHistory />
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
        <Route path="/" element={<DefaultRedirect />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Check for existing session on mount
    initialize();
    
    // Initialize hardware manager
    const hardwareManager = getHardwareManager();
    hardwareManager.initialize().catch(console.error);
  }, [initialize]);

  return <AnimatedRoutes />;
}

export default App;
