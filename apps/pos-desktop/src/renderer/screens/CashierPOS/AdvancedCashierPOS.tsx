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
      const { orderId } = e.detail;
      if (!orderId) {
        return;
      }

      try {
        // Load order details
        const response = await orderService.getOrder(orderId);
        const order = response.data.data.order;
        
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
        setCurrentStep('CHECKOUT');
        toast.success('Order loaded for payment collection');
      } catch (error: any) {
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
    if (collectPaymentOrderId) {
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
          // Small delay to ensure store is updated before navigation
          setTimeout(() => {
            // Clear sessionStorage to prevent re-processing on refresh
            sessionStorage.removeItem('collectPaymentOrderId');
            // Navigate to checkout
            setCurrentStep('CHECKOUT');
            toast.success('Order loaded for payment collection');
          }, 100);
        } catch (error: any) {
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
      <div className="h-screen flex flex-col bg-neutral-50 overflow-hidden">

      {/* ── Top Bar ── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-neutral-0 border-b-2 border-primary-100 px-8 py-4 flex items-center justify-between shadow-sm z-40 flex-shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30"
          >
            <span className="text-white font-black text-xl">P</span>
          </motion.div>
          <div>
            <h1 className="font-display text-2xl font-black text-neutral-900">POSLytic</h1>
            <p className="text-sm text-neutral-600 font-medium">Cashier Terminal</p>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="flex items-center gap-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center px-4 py-2 bg-neutral-50 rounded-2xl border-2 border-neutral-200"
          >
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Orders Today</p>
            <p className="text-2xl font-black text-neutral-900">{todayStats.ordersCompleted}</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center px-4 py-2 bg-neutral-50 rounded-2xl border-2 border-neutral-200"
          >
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Revenue</p>
            <p className="text-2xl font-black text-success-600">{formatCurrency(todayStats.revenue)}</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center px-4 py-2 bg-neutral-50 rounded-2xl border-2 border-neutral-200"
          >
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Avg Order</p>
            <p className="text-2xl font-black text-primary-600">{formatCurrency(todayStats.avgOrderValue)}</p>
          </motion.div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Online/Offline */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-sm ${isOnline ? 'bg-success-100 text-success-700 border-2 border-success-200' : 'bg-error-100 text-error-700 border-2 border-error-200'}`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </motion.div>

          {/* Keyboard shortcuts hint */}
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowKeyboardShortcuts(true)}
            className="p-3 bg-neutral-100 hover:bg-primary-50 rounded-xl transition-colors border-2 border-neutral-200"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-5 h-5 text-primary-600" />
          </motion.button>

          {/* Quick Actions */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(229, 57, 53, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-3 bg-neutral-100 hover:bg-primary-50 rounded-xl transition-colors border-2 border-neutral-200"
              title="Quick Actions"
            >
              <Settings className="w-5 h-5 text-primary-600" />
            </motion.button>
            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute top-14 right-0 bg-neutral-0 rounded-2xl shadow-2xl border-2 border-primary-200 p-2 z-50 min-w-[220px]"
                >
                  {quickActions.map(({ icon: Icon, label, action }) => (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(229, 57, 53, 0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { action(); setShowQuickActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 rounded-xl transition-colors text-sm text-neutral-700 font-semibold"
                    >
                      <Icon className="w-4 h-4 text-primary-600" />
                      {label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3 pl-4 border-l-2 border-neutral-200">
            <div className="text-right">
              <p className="text-sm font-bold text-neutral-900">{user?.fullName || 'Cashier'}</p>
              <p className="text-xs font-semibold text-neutral-600 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-black text-sm border-2 border-primary-200"
            >
              {user?.fullName?.charAt(0) || 'C'}
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-3 bg-error-50 hover:bg-error-100 rounded-xl transition-colors border-2 border-error-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-error-600" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ── Step Progress Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-neutral-0 border-b-2 border-primary-100 px-8 py-3 flex items-center gap-2 flex-shrink-0"
      >
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
              {i > 0 && <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isDone || isActive ? 1 : 0 }}
                className={`flex-1 h-1 ${isDone || isActive ? 'bg-primary-600' : 'bg-neutral-200'} rounded-full`}
              />}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`flex items-center gap-2 text-xs font-bold ${isActive ? 'text-primary-600' : isDone ? 'text-primary-400' : 'text-neutral-400'}`}
              >
                <motion.div
                  animate={{ scale: isActive ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/50' : isDone ? 'bg-primary-100 text-primary-600 border-2 border-primary-300' : 'bg-neutral-200 text-neutral-400 border-2 border-neutral-300'}`}
                >
                  {isDone ? '✓' : i + 1}
                </motion.div>
                <span className="hidden sm:inline">{labels[step]}</span>
              </motion.div>
            </React.Fragment>
          );
        })}
      </motion.div>

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
          <motion.div 
            initial={{ y: 60 }} 
            animate={{ y: 0 }} 
            exit={{ y: 60 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-error-600 to-error-700 text-white px-8 py-4 flex items-center justify-center gap-3 shadow-2xl z-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <WifiOff className="w-6 h-6" />
            </motion.div>
            <span className="font-bold text-base">Offline — Orders will sync when connection is restored</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Overlay */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowKeyboardShortcuts(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-0 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-primary-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black text-neutral-900 flex items-center gap-3">
                  <Keyboard className="w-8 h-8 text-primary-600" />
                  Keyboard Shortcuts
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowKeyboardShortcuts(false)} 
                  className="p-2 hover:bg-error-50 rounded-xl border-2 border-neutral-200"
                >
                  <X className="w-6 h-6 text-error-600" />
                </motion.button>
              </div>
              <div className="bg-neutral-50 rounded-2xl divide-y divide-neutral-200 border-2 border-neutral-200">
                {[
                  { key: 'F1', label: 'New Order' },
                  { key: 'F2', label: 'Hold Current Order' },
                  { key: 'F3', label: 'Toggle Held Orders Panel' },
                  { key: '?', label: 'Show This Overlay' },
                  { key: 'Esc', label: 'Close / Cancel' },
                ].map(({ key, label }) => (
                  <motion.div
                    key={key}
                    whileHover={{ backgroundColor: 'rgba(229, 57, 53, 0.05)' }}
                    className="flex justify-between items-center px-5 py-4"
                  >
                    <span className="text-neutral-700 text-sm font-semibold">{label}</span>
                    <kbd className="px-4 py-2 bg-white border-2 border-neutral-300 rounded-xl text-sm font-mono font-bold shadow-sm text-neutral-900">{key}</kbd>
                  </motion.div>
                ))}
              </div>
              <p className="text-xs font-bold text-neutral-400 text-center mt-6 uppercase tracking-wider">Click anywhere or press Esc to close</p>
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
