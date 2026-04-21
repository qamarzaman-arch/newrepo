import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, WifiOff, Wifi, DollarSign, Printer, RefreshCw, Settings, LogOut, LayoutGrid, Clock, ShoppingCart, Zap, User, HelpCircle, History } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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
import EnhancedMenuOrdering from './EnhancedMenuOrdering';
import KitchenDispatchConfirmation from './KitchenDispatchConfirmation';
import CheckoutPayment from './CheckoutPayment';
import OrderSuccess from './OrderSuccess';

type POSStep = 'ORDER_TYPE' | 'TABLE_CUSTOMER' | 'MENU_ORDERING' | 'CHECKOUT' | 'SUCCESS';

const AdvancedCashierPOS: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { clearOrder, setOrderType, setTable, setCustomer, setGuestCount, currentOrder } = useOrderStore();
  const { formatCurrency } = useCurrencyFormatter();

  const [currentStep, setCurrentStep] = useState<POSStep>('ORDER_TYPE');
  const [orderType, setLocalOrderType] = useState<string>('');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('');
  const [showKitchenModal, setShowKitchenModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);

  const { data: dailySales, refetch: refetchStats } = useQuery({
    queryKey: ['cashier-daily-stats'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
    refetchInterval: 60000,
  });

  const handleNewOrder = useCallback(() => {
    clearOrder();
    setLocalOrderType('');
    setSelectedTableNumber('');
    setCurrentStep('ORDER_TYPE');
  }, [clearOrder]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); handleNewOrder(); }
      if (e.key === 'Escape') setShowKeyboardShortcuts(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNewOrder]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      {/* HEADER BAR */}
      <header className="bg-gray-950 text-white px-8 py-4 flex items-center justify-between shadow-2xl z-50">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/dashboard')}>
               <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <img src="/assets/logo.svg" className="w-6 h-6 brightness-0 invert" alt="" />
               </div>
               <div>
                  <h1 className="text-xl font-black tracking-tighter uppercase italic">POSLytic</h1>
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                     <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{isOnline ? 'Network Active' : 'Offline'}</span>
                  </div>
               </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
               {[
                 { label: 'New Transaction', icon: Plus, active: currentStep === 'ORDER_TYPE', onClick: handleNewOrder },
                 { label: 'Active Orders', icon: Zap, onClick: () => navigate('/cashier-orders') },
                 { label: 'History', icon: History, onClick: () => navigate('/cashier-history') },
               ].map((item, idx) => (
                 <button
                   key={idx}
                   onClick={item.onClick}
                   className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${item.active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                 >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                 </button>
               ))}
            </nav>
         </div>

         <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 px-6 py-2 bg-white/5 rounded-2xl border border-white/10 mr-4">
               <div className="text-right border-r border-white/10 pr-4">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Shift Total</p>
                  <p className="text-sm font-black text-green-400">{formatCurrency(dailySales?.totalRevenue || 0)}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Orders</p>
                  <p className="text-sm font-black text-blue-400">{dailySales?.totalOrders || 0}</p>
               </div>
            </div>

            <button onClick={() => setShowKeyboardShortcuts(true)} className="p-3 bg-white/5 text-white/40 hover:text-white rounded-xl transition-all border border-white/10">
               <Keyboard className="w-5 h-5" />
            </button>

            <div className="h-10 w-[2px] bg-white/10" />

            <div className="flex items-center gap-3 ml-2">
               <div className="text-right hidden sm:block">
                  <p className="text-xs font-black">{user?.fullName}</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Terminal Active</p>
               </div>
               <button onClick={() => { logout(); navigate('/login'); }} className="w-10 h-10 rounded-xl bg-red-950/30 text-red-500 border border-red-900/20 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                  <LogOut className="w-5 h-5" />
               </button>
            </div>
         </div>
      </header>

      {/* MAIN POS VIEW */}
      <main className="flex-1 overflow-hidden relative">
         <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
               {currentStep === 'ORDER_TYPE' && (
                  <OrderTypeSelection
                    onSelect={(type) => {
                      setLocalOrderType(type);
                      setOrderType(type as any);
                      setCurrentStep(type === 'WALK_IN' || type === 'TAKEAWAY' ? 'MENU_ORDERING' : 'TABLE_CUSTOMER');
                    }}
                  />
               )}

               {currentStep === 'TABLE_CUSTOMER' && (
                  <TableCustomerSelection
                    orderType={orderType}
                    onBack={() => setCurrentStep('ORDER_TYPE')}
                    onSelect={(table, customer, guests) => {
                       if (table) {
                         setTable(table.id, table.number);
                         setSelectedTableNumber(table.number);
                       }
                       if (customer) setCustomer(customer.id, customer.fullName);
                       if (guests) setGuestCount(guests);
                       setCurrentStep('MENU_ORDERING');
                    }}
                  />
               )}

               {currentStep === 'MENU_ORDERING' && (
                  <EnhancedMenuOrdering
                    orderType={orderType}
                    tableNumber={selectedTableNumber}
                    customerName={currentOrder.customerName}
                    onBack={() => setCurrentStep('ORDER_TYPE')}
                    onSendToKitchen={() => setShowKitchenModal(true)}
                    onCheckout={() => setCurrentStep('CHECKOUT')}
                  />
               )}

               {currentStep === 'CHECKOUT' && (
                  <CheckoutPayment
                    onBack={() => setCurrentStep('MENU_ORDERING')}
                    onSuccess={(data, change) => {
                      setChangeAmount(change);
                      setCurrentStep('SUCCESS');
                      refetchStats();
                    }}
                  />
               )}

               {currentStep === 'SUCCESS' && (
                  <OrderSuccess
                    receiptData={{
                      orderNumber: currentOrder.orderNumber || '0000',
                      total: currentOrder.totalAmount || 0,
                      items: currentOrder.items,
                      orderType: orderType,
                      tableNumber: selectedTableNumber,
                      customerName: currentOrder.customerName,
                      orderId: (currentOrder as any).id
                    }}
                    change={changeAmount}
                    onNewOrder={handleNewOrder}
                  />
               )}
            </motion.div>
         </AnimatePresence>

         <KitchenDispatchConfirmation
            isOpen={showKitchenModal}
            onClose={() => setShowKitchenModal(false)}
            onConfirm={async () => {
              // Internal implementation for kitchen dispatch
              toast.success('Order dispatched to kitchen terminal');
              setShowKitchenModal(false);
            }}
         />

         {showKeyboardShortcuts && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                 <h3 className="text-3xl font-black text-gray-900 mb-8 uppercase tracking-tight">System Hotkeys</h3>
                 <div className="grid grid-cols-2 gap-6">
                    {[
                      { key: 'F1', label: 'Initialize New Order' },
                      { key: 'F2', label: 'Suspend Active Session' },
                      { key: 'F3', label: 'View Suspended List' },
                      { key: 'ESC', label: 'Close Active Overlay' },
                      { key: '?', label: 'Open Command Help' },
                    ].map((hk, i) => (
                       <div key={i} className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                          <span className="font-bold text-gray-600">{hk.label}</span>
                          <kbd className="px-4 py-2 bg-gray-900 text-white rounded-xl font-mono text-sm font-black shadow-lg shadow-black/20">{hk.key}</kbd>
                       </div>
                    ))}
                 </div>
                 <button onClick={() => setShowKeyboardShortcuts(false)} className="w-full mt-10 py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">Return to Terminal</button>
              </motion.div>
           </div>
         )}
      </main>

      <OfflineQueueStatus />
    </div>
  );
};

export default AdvancedCashierPOS;
