import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, WifiOff, Wifi, DollarSign, Printer, RefreshCw, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { reportService } from '../../services/reportService';
import { orderService } from '../../services/orderService';
import { getHardwareManager } from '../../services/hardwareManager';
import { useQuery } from '@tanstack/react-query';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import toast from 'react-hot-toast';
import ErrorBoundary from '../../components/ErrorBoundary';
import OfflineQueueStatus from '../../components/OfflineQueueStatus';

import OrderTypeSelection from './OrderTypeSelection';
import TableCustomerSelection from './TableCustomerSelection';
import ReservationDetails from './ReservationDetails';
import EnhancedMenuOrdering from './EnhancedMenuOrdering';
import KitchenDispatchConfirmation from './KitchenDispatchConfirmation';
import CheckoutPayment from './CheckoutPayment';
import OrderSuccess from './OrderSuccess';

type POSStep = 'ORDER_TYPE' | 'TABLE_CUSTOMER' | 'RESERVATION_DETAILS' | 'MENU_ORDERING' | 'CHECKOUT' | 'SUCCESS';

const AdvancedCashierPOS: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { clearOrder, setOrderType, setTable, setCustomer, setGuestCount } = useOrderStore();
  const { formatCurrency } = useCurrencyFormatter();

  const [currentStep, setCurrentStep] = useState<POSStep>('ORDER_TYPE');
  const [orderType, setLocalOrderType] = useState<string>('');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('');
  const [showKitchenModal, setShowKitchenModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);

  // Daily stats
  const { data: dailySales, refetch: refetchStats } = useQuery({
    queryKey: ['cashier-daily-stats'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
    refetchInterval: 60000,
  });

  const todayStats = {
    ordersCompleted: dailySales?.totalOrders || 0,
    revenue: dailySales?.totalRevenue || 0,
    avgOrderValue: (dailySales?.totalOrders || 0) > 0
      ? (dailySales?.totalRevenue || 0) / dailySales?.totalOrders
      : 0,
  };

  // useCallback fixes stale closure on keyboard shortcuts
  const handleNewOrder = useCallback(() => {
    clearOrder();
    setLocalOrderType('');
    setSelectedTableNumber('');
    setCurrentStep('ORDER_TYPE');
  }, [clearOrder]);

  useEffect(() => {
    if (user && user.role !== 'CASHIER' && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      toast.error('Access denied.');
      navigate('/dashboard');
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); handleNewOrder(); }
      if (e.key === 'F2') { e.preventDefault(); window.dispatchEvent(new CustomEvent('pos:hold-order')); }
      if (e.key === 'F3') { e.preventDefault(); window.dispatchEvent(new CustomEvent('pos:toggle-held-orders')); }
      if (e.key === 'Escape') { setShowKeyboardShortcuts(false); setShowQuickActions(false); }
      if (e.key === '?' || e.key === '/') { e.preventDefault(); setShowKeyboardShortcuts(true); }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Handle collect payment event from Active Orders
    const handleCollectPayment = async (e: any) => {
      console.log('[AdvancedCashierPOS] Collect payment event received:', e.detail);
      const { orderId } = e.detail;
      if (!orderId) {
        console.log('[AdvancedCashierPOS] No orderId in event detail');
        return;
      }

      try {
        // Load order details
        console.log('[AdvancedCashierPOS] Fetching order:', orderId);
        const response = await orderService.getOrder(orderId);
        const order = response.data.data.order;
        console.log('[AdvancedCashierPOS] Order loaded:', order);
        
        if (!order) {
          toast.error('Order not found');
          return;
        }

        // Pre-populate order store with the order data
        clearOrder();
        setOrderType(order.orderType);
        if (order.tableId) {
          setTable(order.tableId, order.table?.tableNumber);
        }
        if (order.customerId || order.customerName) {
          setCustomer({
            id: order.customerId,
            name: order.customerName || 'Walk-in',
            phone: order.customerPhone,
          });
        }
        // Load items into order store
        order.items?.forEach((item: any) => {
          useOrderStore.getState().addItem({
            menuItemId: item.menuItemId || item.menuItem?.id,
            name: item.menuItem?.name || item.name,
            price: Number(item.unitPrice),
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers,
          });
        });
        
        // Navigate to checkout
        console.log('[AdvancedCashierPOS] Navigating to CHECKOUT');
        setCurrentStep('CHECKOUT');
        toast.success('Order loaded for payment collection');
      } catch (error: any) {
        console.error('[AdvancedCashierPOS] Failed to load order:', error);
        console.error('[AdvancedCashierPOS] Error response:', error.response?.data);
        toast.error(error.response?.data?.error?.message || 'Failed to load order for payment');
      }
    };
    window.addEventListener('pos:collect-payment', handleCollectPayment);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pos:collect-payment', handleCollectPayment);
    };
  }, [user, navigate, handleNewOrder, clearOrder, setOrderType, setTable, setCustomer, setCurrentStep]);

  // Handle collect payment from sessionStorage (when coming from Active Orders)
  useEffect(() => {
    const collectPaymentOrderId = sessionStorage.getItem('collectPaymentOrderId');
    console.log('[AdvancedCashierPOS] collectPaymentOrderId from sessionStorage:', collectPaymentOrderId);
    if (collectPaymentOrderId) {
      console.log('[AdvancedCashierPOS] Found collectPaymentOrderId:', collectPaymentOrderId);
      // Load order and go to checkout
      const loadOrderForPayment = async () => {
        try {
          const response = await orderService.getOrder(collectPaymentOrderId);
          const order = response.data.data.order;
          if (!order) {
            toast.error('Order not found');
            return;
          }
          // Pre-populate order store
          clearOrder();
          setOrderType(order.orderType);
          if (order.tableId) {
            setTable(order.tableId, order.table?.tableNumber);
          }
          if (order.customerId || order.customerName) {
            setCustomer({
              id: order.customerId,
              name: order.customerName || 'Walk-in',
              phone: order.customerPhone,
            });
          }
          console.log('[AdvancedCashierPOS] Loading', order.items?.length, 'items into order store');
          order.items?.forEach((item: any) => {
            useOrderStore.getState().addItem({
              menuItemId: item.menuItemId || item.menuItem?.id,
              name: item.menuItem?.name || item.name,
              price: Number(item.unitPrice),
              quantity: item.quantity,
              notes: item.notes,
              modifiers: item.modifiers,
            });
          });
          console.log('[AdvancedCashierPOS] Items loaded, store now has:', useOrderStore.getState().currentOrder.items.length, 'items');
          // Small delay to ensure store is updated before navigation
          setTimeout(() => {
            // Clear sessionStorage to prevent re-processing on refresh
            sessionStorage.removeItem('collectPaymentOrderId');
            // Navigate to checkout
            setCurrentStep('CHECKOUT');
            toast.success('Order loaded for payment collection');
          }, 100);
        } catch (error: any) {
          console.error('[AdvancedCashierPOS] Failed to load order:', error);
          toast.error(error.response?.data?.error?.message || 'Failed to load order for payment');
        }
      };
      loadOrderForPayment();
    }
  }, [navigate, clearOrder, setOrderType, setTable, setCustomer, setCurrentStep]);

  const handleOrderTypeSelect = (type: string) => {
    setLocalOrderType(type);
    setOrderType(type as any);
    if (type === 'PICKUP') {
      setCurrentStep('MENU_ORDERING');
    } else if (type === 'RESERVATION') {
      setCurrentStep('RESERVATION_DETAILS');
    } else {
      setCurrentStep('TABLE_CUSTOMER');
    }
  };

  const handleTableCustomerSelect = (data: {
    tableId?: string; tableNumber?: string; customerName?: string;
    customerPhone?: string; customerAddress?: string; guestCount?: number;
  }) => {
    if (data.tableId) { setTable(data.tableId, data.tableNumber); setSelectedTableNumber(data.tableNumber || ''); }
    if (data.customerName) setCustomer({ name: data.customerName, phone: data.customerPhone, address: data.customerAddress });
    if (data.guestCount) setGuestCount(data.guestCount);
    setCurrentStep('MENU_ORDERING');
  };

  const handleReservationSelect = async (data: {
    customerName?: string; customerPhone?: string; tableId?: string;
    tableNumber?: string; guestCount?: number; reservationDate?: string;
    reservationTime?: string; notes?: string;
  }) => {
    try {
      // Create reservation directly via API
      const response = await orderService.createReservation({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        tableId: data.tableId,
        notes: data.notes,
      });
      
      if (response.data.success) {
        toast.success(`Reservation created for ${data.customerName} on ${data.reservationDate} at ${data.reservationTime}`);
        setCurrentStep('SUCCESS');
      }
    } catch (error: any) {
      console.error('Failed to create reservation:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to create reservation');
    }
  };

  const handleSendToKitchen = () => {
    const { currentOrder } = useOrderStore.getState();
    if (currentOrder.items.length === 0) { toast.error('No items to send'); return; }
    setShowKitchenModal(true);
  };

  const handleBack = () => {
    if (currentStep === 'TABLE_CUSTOMER' || currentStep === 'RESERVATION_DETAILS') setCurrentStep('ORDER_TYPE');
    else if (currentStep === 'MENU_ORDERING') setCurrentStep(orderType === 'DINE_IN' || orderType === 'DELIVERY' ? 'TABLE_CUSTOMER' : 'ORDER_TYPE');
    else if (currentStep === 'CHECKOUT') setCurrentStep('MENU_ORDERING');
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleOpenCashDrawer = async () => {
    try {
      const ok = await getHardwareManager().openCashDrawer();
      if (ok) toast.success('Cash drawer opened!');
      else toast.error('Cash drawer not available');
    } catch { toast.error('Cash drawer not available'); }
  };

  const handlePrintZReport = () => { window.print(); toast.success('Z-Report sent to printer'); };

  const quickActions = [
    { icon: Printer, label: 'Print Z-Report', action: handlePrintZReport },
    { icon: DollarSign, label: 'Open Cash Drawer', action: handleOpenCashDrawer },
    { icon: RefreshCw, label: 'Sync Data', action: async () => {
      try { toast.loading('Syncing...', { id: 'sync' }); await refetchStats(); toast.success('Synced!', { id: 'sync' }); }
      catch { toast.error('Sync failed', { id: 'sync' }); }
    }},
  ];

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-40 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <div>
            <h1 className="font-manrope text-xl font-bold text-gray-900">POSLytic</h1>
            <p className="text-xs text-gray-500">Cashier Terminal</p>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">Orders Today</p>
            <p className="text-lg font-bold text-gray-900">{todayStats.ordersCompleted}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(todayStats.revenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Avg Order</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(todayStats.avgOrderValue)}</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Online/Offline */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* Keyboard shortcuts hint */}
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4 text-gray-600" />
          </button>

          {/* Quick Actions */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Quick Actions"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </motion.button>
            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute top-11 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 min-w-[200px]"
                >
                  {quickActions.map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      onClick={() => { action(); setShowQuickActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700"
                    >
                      <Icon className="w-4 h-4 text-gray-500" />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.fullName || 'Cashier'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.fullName?.charAt(0) || 'C'}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-red-600" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* ── Step Progress Bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-2 flex-shrink-0">
        {(['ORDER_TYPE', 'TABLE_CUSTOMER', 'RESERVATION_DETAILS', 'MENU_ORDERING', 'CHECKOUT', 'SUCCESS'] as POSStep[]).map((step, i) => {
          const labels: Record<POSStep, string> = {
            ORDER_TYPE: 'Order Type', TABLE_CUSTOMER: 'Table / Customer',
            RESERVATION_DETAILS: 'Reservation', MENU_ORDERING: 'Menu', CHECKOUT: 'Payment', SUCCESS: 'Complete',
          };
          const stepIndex = ['ORDER_TYPE', 'TABLE_CUSTOMER', 'RESERVATION_DETAILS', 'MENU_ORDERING', 'CHECKOUT', 'SUCCESS'].indexOf(currentStep);
          const isActive = step === currentStep;
          const isDone = i < stepIndex;
          // Skip TABLE_CUSTOMER step indicator for pickup
          if (step === 'TABLE_CUSTOMER' && orderType === 'PICKUP') return null;
          // Skip RESERVATION_DETAILS for non-reservation orders
          if (step === 'RESERVATION_DETAILS' && orderType !== 'RESERVATION') return null;
          // Skip MENU_ORDERING and CHECKOUT for reservation (it goes straight to success)
          if (orderType === 'RESERVATION' && (step === 'MENU_ORDERING' || step === 'CHECKOUT')) return null;
          return (
            <React.Fragment key={step}>
              {i > 0 && <div className={`flex-1 h-0.5 ${isDone || isActive ? 'bg-primary' : 'bg-gray-200'}`} />}
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${isActive ? 'text-primary' : isDone ? 'text-primary/60' : 'text-gray-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-primary text-white' : isDone ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-gray-400'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className="hidden sm:inline">{labels[step]}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === 'ORDER_TYPE' && (
            <motion.div key="order-type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
              <OrderTypeSelection onSelect={handleOrderTypeSelect} />
            </motion.div>
          )}
          {currentStep === 'TABLE_CUSTOMER' && (
            <motion.div key="table-customer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
              <TableCustomerSelection orderType={orderType} onBack={handleBack} onSelect={handleTableCustomerSelect} />
            </motion.div>
          )}
          {currentStep === 'RESERVATION_DETAILS' && (
            <motion.div key="reservation-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
              <ReservationDetails onBack={handleBack} onSelect={handleReservationSelect} />
            </motion.div>
          )}
          {currentStep === 'MENU_ORDERING' && (
            <motion.div key="menu-ordering" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
              <EnhancedMenuOrdering
                orderType={orderType}
                tableNumber={selectedTableNumber}
                onBack={handleBack}
                onCheckout={() => setCurrentStep('CHECKOUT')}
                onSendToKitchen={handleSendToKitchen}
              />
            </motion.div>
          )}
          {currentStep === 'CHECKOUT' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
              <CheckoutPayment onBack={handleBack} onComplete={(change) => { setChangeAmount(typeof change === 'number' ? change : 0); setCurrentStep('SUCCESS'); }} />
            </motion.div>
          )}
          {currentStep === 'SUCCESS' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="h-full">
              <OrderSuccess onNewOrder={handleNewOrder} change={changeAmount} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <KitchenDispatchConfirmation
        isOpen={showKitchenModal}
        onClose={() => setShowKitchenModal(false)}
        onConfirm={() => {
          setShowKitchenModal(false);
          // Auto-start new order after sending to kitchen
          setTimeout(() => {
            handleNewOrder();
            toast.success('Order sent! Starting new order...', { duration: 2000 });
          }, 500);
        }}
      />

      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
            className="fixed bottom-0 left-0 right-0 bg-red-600 text-white px-6 py-3 flex items-center justify-center gap-3 shadow-lg z-50">
            <WifiOff className="w-5 h-5" />
            <span className="font-semibold text-sm">Offline — Orders will sync when connection is restored</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Overlay */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowKeyboardShortcuts(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Keyboard className="w-7 h-7 text-primary" />
                  Keyboard Shortcuts
                </h2>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                {[
                  { key: 'F1', label: 'New Order' },
                  { key: 'F2', label: 'Hold Current Order' },
                  { key: 'F3', label: 'Toggle Held Orders Panel' },
                  { key: '?', label: 'Show This Overlay' },
                  { key: 'Esc', label: 'Close / Cancel' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex justify-between items-center px-4 py-3">
                    <span className="text-gray-700 text-sm">{label}</span>
                    <kbd className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-mono font-bold shadow-sm">{key}</kbd>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">Click anywhere or press Esc to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Offline Queue Status */}
      <OfflineQueueStatus />
    </ErrorBoundary>
  );
};

export default AdvancedCashierPOS;
