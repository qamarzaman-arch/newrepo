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
    avgOrderValue:
      (dailySales?.totalOrders || 0) > 0
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

  /**
   * Shared helper — loads an order by ID into the store and navigates to checkout.
   * Used by both the custom event listener and the sessionStorage bootstrap.
   */
  const loadOrderForPayment = useCallback(
    async (orderId: string) => {
      try {
        const response = await orderService.getOrder(orderId);
        const order = response.data.data.order;

        if (!order) {
          toast.error('Order not found');
          return;
        }

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

        setCurrentStep('CHECKOUT');
        toast.success('Order loaded for payment collection');
      } catch (error: any) {
        toast.error(
          error.response?.data?.error?.message || 'Failed to load order for payment'
        );
      }
    },
    [clearOrder, setOrderType, setTable, setCustomer, setCurrentStep]
  );

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
      if (!orderId) return;
      await loadOrderForPayment(orderId);
    };
    window.addEventListener('pos:collect-payment', handleCollectPayment);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pos:collect-payment', handleCollectPayment);
    };
  }, [user, navigate, handleNewOrder, loadOrderForPayment]);

  // Handle collect payment from sessionStorage (when navigating from Active Orders)
  useEffect(() => {
    const collectPaymentOrderId = sessionStorage.getItem('collectPaymentOrderId');
    if (collectPaymentOrderId) {
      // Small delay to ensure store is ready before navigation
      const timer = setTimeout(async () => {
        sessionStorage.removeItem('collectPaymentOrderId');
        await loadOrderForPayment(collectPaymentOrderId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loadOrderForPayment]);

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
    {
      icon: RefreshCw, label: 'Sync Data', action: async () => {
        try {
          toast.loading('Syncing…', { id: 'sync' });
          await refetchStats();
          toast.success('Synced!', { id: 'sync' });
        } catch {
          toast.error('Sync failed', { id: 'sync' });
        }
      },
    },
  ];

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 overflow-hidden">

        {/* ── Top Bar (h-14 compact) ── */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="h-14 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-5 flex items-center justify-between shadow-sm z-40 flex-shrink-0"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/30 flex-shrink-0">
              <span className="text-white font-black text-sm leading-none">P</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-neutral-900 dark:text-neutral-100 text-base leading-none">POSLytic</span>
              <span className="text-xs font-semibold text-neutral-400 leading-none hidden sm:inline">Cashier</span>
            </div>
          </div>

          {/* Compact daily stats pill */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full text-xs font-semibold text-neutral-600"
          >
            <span className="font-black text-neutral-900 dark:text-neutral-100">{todayStats.ordersCompleted}</span>
            <span className="text-neutral-400">orders</span>
            <span className="text-neutral-300 mx-0.5">·</span>
            <span className="font-black text-emerald-600">{formatCurrency(todayStats.revenue)}</span>
            <span className="text-neutral-400">today</span>
            <span className="text-neutral-300 mx-0.5">·</span>
            <span className="text-neutral-400">avg</span>
            <span className="font-black text-primary-600">{formatCurrency(todayStats.avgOrderValue)}</span>
          </motion.div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Online/Offline */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Keyboard shortcuts */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 bg-neutral-100 hover:bg-primary-50 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-4 h-4 text-primary-600" />
            </motion.button>

            {/* Quick Actions */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="p-2 bg-neutral-100 hover:bg-primary-50 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
                title="Quick Actions"
              >
                <Settings className="w-4 h-4 text-primary-600" />
              </motion.button>
              <AnimatePresence>
                {showQuickActions && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute top-11 right-0 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-1.5 z-50 min-w-[200px]"
                  >
                    {quickActions.map(({ icon: Icon, label, action }) => (
                      <motion.button
                        key={label}
                        whileHover={{ backgroundColor: 'rgba(211,47,47,0.05)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { action(); setShowQuickActions(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary-50 rounded-lg transition-colors text-sm text-neutral-700 font-semibold"
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
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-700 ml-1">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-xs border border-primary-200 dark:border-neutral-700 flex-shrink-0">
                {user?.fullName?.charAt(0) || 'C'}
              </div>
              <div className="hidden sm:block text-right leading-none">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{user?.fullName || 'Cashier'}</p>
                <p className="text-[11px] text-neutral-400 font-medium capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleLogout}
                className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-red-600" />
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* ── Step Progress Bar (h-10 compact) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="h-10 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-5 flex items-center gap-1.5 flex-shrink-0"
        >
          {(
            ['ORDER_TYPE', 'TABLE_CUSTOMER', 'RESERVATION_DETAILS', 'MENU_ORDERING', 'CHECKOUT', 'SUCCESS'] as POSStep[]
          ).map((step, i) => {
            const labels: Record<POSStep, string> = {
              ORDER_TYPE: 'Order Type',
              TABLE_CUSTOMER: 'Table / Customer',
              RESERVATION_DETAILS: 'Reservation',
              MENU_ORDERING: 'Menu',
              CHECKOUT: 'Payment',
              SUCCESS: 'Complete',
            };
            const stepIndex = [
              'ORDER_TYPE', 'TABLE_CUSTOMER', 'RESERVATION_DETAILS', 'MENU_ORDERING', 'CHECKOUT', 'SUCCESS',
            ].indexOf(currentStep);
            const isActive = step === currentStep;
            const isDone = i < stepIndex;

            if (step === 'TABLE_CUSTOMER' && orderType === 'PICKUP') return null;
            if (step === 'RESERVATION_DETAILS' && orderType !== 'RESERVATION') return null;
            if (orderType === 'RESERVATION' && (step === 'MENU_ORDERING' || step === 'CHECKOUT')) return null;

            return (
              <React.Fragment key={step}>
                {i > 0 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isDone || isActive ? 1 : 0 }}
                    className={`flex-1 h-0.5 rounded-full ${isDone || isActive ? 'bg-primary-600' : 'bg-neutral-200'}`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap ${
                    isActive ? 'text-primary-600' : isDone ? 'text-primary-400' : 'text-neutral-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : isDone
                        ? 'bg-primary-100 text-primary-600 border border-primary-300'
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{labels[step]}</span>
                </div>
              </React.Fragment>
            );
          })}
        </motion.div>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === 'ORDER_TYPE' && (
              <motion.div key="order-type" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="h-full">
                <OrderTypeSelection onSelect={handleOrderTypeSelect} />
              </motion.div>
            )}
            {currentStep === 'TABLE_CUSTOMER' && (
              <motion.div key="table-customer" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="h-full">
                <TableCustomerSelection orderType={orderType} onBack={handleBack} onSelect={handleTableCustomerSelect} />
              </motion.div>
            )}
            {currentStep === 'RESERVATION_DETAILS' && (
              <motion.div key="reservation-details" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="h-full">
                <ReservationDetails onBack={handleBack} onSelect={handleReservationSelect} />
              </motion.div>
            )}
            {currentStep === 'MENU_ORDERING' && (
              <motion.div key="menu-ordering" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="h-full">
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
              <motion.div key="checkout" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="h-full">
                <CheckoutPayment
                  onBack={handleBack}
                  onComplete={(change) => {
                    setChangeAmount(typeof change === 'number' ? change : 0);
                    setCurrentStep('SUCCESS');
                  }}
                />
              </motion.div>
            )}
            {currentStep === 'SUCCESS' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }} className="h-full">
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
            setTimeout(() => {
              handleNewOrder();
              toast.success('Order sent! Starting new order…', { duration: 2000 });
            }, 500);
          }}
        />

        {/* ── Offline Banner ── */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ y: 56 }}
              animate={{ y: 0 }}
              exit={{ y: 56 }}
              className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-700 to-red-600 text-white px-6 py-3 flex items-center justify-center gap-3 shadow-2xl z-50"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <WifiOff className="w-5 h-5" />
              </motion.div>
              <span className="font-bold text-sm">Offline — Orders will sync when connection is restored</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Keyboard Shortcuts Overlay ── */}
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
                initial={{ scale: 0.93, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.93, opacity: 0 }}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 dark:border-neutral-700"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
                    <Keyboard className="w-6 h-6 text-primary-600" />
                    Keyboard Shortcuts
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowKeyboardShortcuts(false)}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </motion.button>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl divide-y divide-neutral-100 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  {[
                    { key: 'F1', label: 'New Order' },
                    { key: 'F2', label: 'Hold Current Order' },
                    { key: 'F3', label: 'Toggle Held Orders Panel' },
                    { key: '?', label: 'Show This Overlay' },
                    { key: 'Esc', label: 'Close / Cancel' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex justify-between items-center px-4 py-3">
                      <span className="text-neutral-700 text-sm font-semibold">{label}</span>
                      <kbd className="px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 rounded-lg text-xs font-mono font-bold shadow-sm text-neutral-800">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-bold text-neutral-400 text-center mt-4 uppercase tracking-wider">
                  Click anywhere or press Esc to close
                </p>
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
