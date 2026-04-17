import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Wifi, WifiOff, 
  Printer, RefreshCw, History, Settings, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

// Import all POS flow screens
import OrderTypeSelection from './OrderTypeSelection';
import TableCustomerSelection from './TableCustomerSelection';
import EnhancedMenuOrdering from './EnhancedMenuOrdering';
import KitchenDispatchConfirmation from './KitchenDispatchConfirmation';
import CheckoutPayment from './CheckoutPayment';
import OrderSuccess from './OrderSuccess';

type POSStep = 
  | 'ORDER_TYPE'
  | 'TABLE_CUSTOMER'
  | 'MENU_ORDERING'
  | 'CHECKOUT'
  | 'SUCCESS';

const AdvancedCashierPOS: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { clearOrder } = useOrderStore();

  // State management for POS flow
  const [currentStep, setCurrentStep] = useState<POSStep>('ORDER_TYPE');
  const [orderType, setOrderType] = useState<string>('');
  const [showKitchenModal, setShowKitchenModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Mock data for today's stats
  const todayStats = {
    ordersCompleted: 47,
    revenue: 1847.50,
    avgOrderValue: 39.31,
    activeOrders: 8,
  };

  // Role-based access control - redirect non-cashiers
  React.useEffect(() => {
    if (user && user.role !== 'CASHIER') {
      toast.error('Access denied. Cashier role required.');
      navigate('/dashboard');
    }

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, navigate]);

  // Step handlers
  const handleOrderTypeSelect = (type: string) => {
    setOrderType(type);
    
    if (type === 'WALK_IN' || type === 'TAKEAWAY') {
      setCurrentStep('MENU_ORDERING');
    } else {
      setCurrentStep('TABLE_CUSTOMER');
    }
  };

  const handleTableCustomerSelect = (_data: {
    tableId?: string;
    customerName?: string;
    customerPhone?: string;
    guestCount?: number;
  }) => {
    // Customer and table data is managed in the order store
    setCurrentStep('MENU_ORDERING');
  };

  const handleSendToKitchen = () => {
    setShowKitchenModal(true);
  };

  const handleConfirmKitchenDispatch = () => {
    setShowKitchenModal(false);
    toast.success('Items sent to kitchen!');
  };

  const handleCheckout = () => {
    setCurrentStep('CHECKOUT');
  };

  const handleCompleteOrder = async () => {
    try {
      const { currentOrder } = useOrderStore.getState();
      
      // Create order in backend
      const orderData = {
        orderType: currentOrder.orderType,
        tableId: currentOrder.tableId,
        customerId: currentOrder.customerId,
        customerName: currentOrder.customerName,
        customerPhone: currentOrder.customerPhone,
        items: currentOrder.items.map((item: any) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        kitchenNotes: currentOrder.notes,
      };

      const response = await orderService.createOrder(orderData);
      
      if (response.data.success) {
        toast.success('Order placed successfully!');
        setCurrentStep('SUCCESS');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to place order');
      console.error('Order creation error:', error);
    }
  };

  const handleNewOrder = () => {
    clearOrder();
    setOrderType('');
    setCurrentStep('ORDER_TYPE');
  };

  const handleBack = () => {
    const stepOrder: POSStep[] = ['ORDER_TYPE', 'TABLE_CUSTOMER', 'MENU_ORDERING', 'CHECKOUT', 'SUCCESS'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePrintReceipt = () => {
    toast.success('Printing receipt...');
  };

  const handleOpenCashDrawer = () => {
    toast.success('Opening cash drawer...');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <div>
            <h1 className="font-manrope text-xl font-bold text-gray-900">POSLytic</h1>
            <p className="text-xs text-gray-500">Cashier Terminal</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">Orders Today</p>
            <p className="text-lg font-bold text-gray-900">{todayStats.ordersCompleted}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-green-600">${todayStats.revenue.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Avg Order</p>
            <p className="text-lg font-bold text-primary">${todayStats.avgOrderValue.toFixed(2)}</p>
          </div>
        </div>

        {/* Status Indicators & Actions */}
        <div className="flex items-center gap-3">
          {/* Online/Offline Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-xs font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Quick Actions Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Quick Actions"
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </motion.button>

          {/* User Info */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.username || 'Cashier'}</p>
              <p className="text-xs text-gray-500">Cashier</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Quick Actions Dropdown */}
      {showQuickActions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-16 right-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 min-w-[200px]"
        >
          <div className="space-y-2">
            <button
              onClick={() => { handlePrintReceipt(); setShowQuickActions(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Print Z-Report</span>
            </button>
            <button
              onClick={() => { handleOpenCashDrawer(); setShowQuickActions(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <DollarSign className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Open Cash Drawer</span>
            </button>
            <button
              onClick={() => { navigate('/orders'); setShowQuickActions(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <History className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">View Orders</span>
            </button>
            <button
              onClick={() => { /* Sync offline data */ setShowQuickActions(false); }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Sync Data</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === 'ORDER_TYPE' && (
            <motion.div
              key="order-type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <OrderTypeSelection onSelect={handleOrderTypeSelect} />
            </motion.div>
          )}

          {currentStep === 'TABLE_CUSTOMER' && (
            <motion.div
              key="table-customer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <TableCustomerSelection
                orderType={orderType}
                onBack={handleBack}
                onSelect={handleTableCustomerSelect}
              />
            </motion.div>
          )}

          {currentStep === 'MENU_ORDERING' && (
            <motion.div
              key="menu-ordering"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <EnhancedMenuOrdering
                orderType={orderType}
                onBack={handleBack}
                onCheckout={handleCheckout}
                onSendToKitchen={handleSendToKitchen}
              />
            </motion.div>
          )}

          {currentStep === 'CHECKOUT' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <CheckoutPayment
                onBack={handleBack}
                onComplete={handleCompleteOrder}
              />
            </motion.div>
          )}

          {currentStep === 'SUCCESS' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <OrderSuccess onNewOrder={handleNewOrder} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Kitchen Dispatch Modal */}
      <KitchenDispatchConfirmation
        isOpen={showKitchenModal}
        onClose={() => setShowKitchenModal(false)}
        onConfirm={handleConfirmKitchenDispatch}
      />

      {/* Offline Mode Banner */}
      {!isOnline && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 bg-red-600 text-white px-6 py-3 flex items-center justify-center gap-3 shadow-lg"
        >
          <WifiOff className="w-5 h-5" />
          <span className="font-semibold">Offline Mode - Orders will sync when connection is restored</span>
        </motion.div>
      )}
    </div>
  );
};

export default AdvancedCashierPOS;
