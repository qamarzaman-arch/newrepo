import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

// Import all POS flow screens
import OrderTypeSelection from './OrderTypeSelection';
import TableCustomerSelection from './TableCustomerSelection';
import MenuOrdering from './MenuOrdering';
import KitchenDispatchConfirmation from './KitchenDispatchConfirmation';
import CheckoutPayment from './CheckoutPayment';
import OrderSuccess from './OrderSuccess';

type POSStep = 
  | 'ORDER_TYPE'
  | 'TABLE_CUSTOMER'
  | 'MENU_ORDERING'
  | 'CHECKOUT'
  | 'SUCCESS';

const CashierPOS: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clearOrder } = useOrderStore();

  // State management for POS flow
  const [currentStep, setCurrentStep] = useState<POSStep>('ORDER_TYPE');
  const [orderType, setOrderType] = useState<string>('');
  const [tableId, setTableId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [showKitchenModal, setShowKitchenModal] = useState(false);

  // Role-based access control - redirect non-cashiers
  React.useEffect(() => {
    if (user && user.role !== 'CASHIER') {
      toast.error('Access denied. Cashier role required.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Step 1: Order Type Selection
  const handleOrderTypeSelect = (type: string) => {
    setOrderType(type);
    
    // For Walk-In and Takeaway, skip table selection
    if (type === 'WALK_IN' || type === 'TAKEAWAY') {
      setCurrentStep('MENU_ORDERING');
    } else {
      setCurrentStep('TABLE_CUSTOMER');
    }
  };

  // Step 2: Table/Customer Selection
  const handleTableCustomerSelect = (data: {
    tableId?: string;
    customerName?: string;
    customerPhone?: string;
    guestCount?: number;
  }) => {
    if (data.tableId) setTableId(data.tableId);
    if (data.customerName) setCustomerName(data.customerName);
    // Customer phone and guest count are managed in the order store
    setCurrentStep('MENU_ORDERING');
  };

  // Step 3: Send to Kitchen
  const handleSendToKitchen = () => {
    setShowKitchenModal(true);
  };

  const handleConfirmKitchenDispatch = () => {
    setShowKitchenModal(false);
    toast.success('Items sent to kitchen!');
    // In a real app, this would call API to create order items
  };

  // Step 3: Proceed to Checkout
  const handleCheckout = () => {
    setCurrentStep('CHECKOUT');
  };

  // Step 4: Complete Order
  const handleCompleteOrder = async () => {
    try {
      const { currentOrder } = useOrderStore.getState();
      
      const orderData = {
        orderType: orderType as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP',
        tableId: tableId || undefined,
        customerName: customerName || undefined,
        items: currentOrder.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
        })),
      };
      
      await orderService.createOrder(orderData);
      toast.success('Order placed successfully!');
      clearOrder();
      setCurrentStep('SUCCESS');
    } catch (error) {
      toast.error('Failed to place order');
      console.error('Order creation error:', error);
    }
  };

  // Step 5: Start New Order
  const handleNewOrder = () => {
    clearOrder();
    setOrderType('');
    setTableId(null);
    setCustomerName('');
    setCurrentStep('ORDER_TYPE');
  };

  // Back navigation handlers
  const handleBackFromOrderType = () => {
    navigate('/dashboard');
  };

  const handleBackFromTableCustomer = () => {
    setCurrentStep('ORDER_TYPE');
  };

  const handleBackFromMenu = () => {
    setCurrentStep(orderType === 'DINE_IN' || orderType === 'DELIVERY' ? 'TABLE_CUSTOMER' : 'ORDER_TYPE');
  };

  const handleBackFromCheckout = () => {
    setCurrentStep('MENU_ORDERING');
  };

  // Render current step with animation
  const renderStep = () => {
    switch (currentStep) {
      case 'ORDER_TYPE':
        return (
          <motion.div
            key="order-type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <OrderTypeSelection onSelect={handleOrderTypeSelect} onBack={handleBackFromOrderType} />
          </motion.div>
        );

      case 'TABLE_CUSTOMER':
        return (
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
              selectedTableId={tableId}
              onSelect={handleTableCustomerSelect}
              onBack={handleBackFromTableCustomer}
            />
          </motion.div>
        );

      case 'MENU_ORDERING':
        return (
          <motion.div
            key="menu-ordering"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <MenuOrdering
              orderType={orderType}
              tableId={tableId || undefined}
              customerName={customerName || undefined}
              onBack={handleBackFromMenu}
              onSendToKitchen={handleSendToKitchen}
              onCheckout={handleCheckout}
            />
          </motion.div>
        );

      case 'CHECKOUT':
        return (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <CheckoutPayment
              onBack={handleBackFromCheckout}
              onComplete={handleCompleteOrder}
            />
          </motion.div>
        );

      case 'SUCCESS':
        return (
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="text-white font-manrope font-black text-lg">P</span>
          </div>
          <div>
            <h1 className="font-manrope text-xl font-bold text-gray-900 tracking-tight">POSLytic</h1>
            <p className="text-xs text-gray-500">Cashier Terminal</p>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{user?.fullName || 'Cashier'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.fullName?.charAt(0) || 'C'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      {/* Kitchen Dispatch Modal */}
      <KitchenDispatchConfirmation
        isOpen={showKitchenModal}
        onClose={() => setShowKitchenModal(false)}
        onConfirm={handleConfirmKitchenDispatch}
      />
    </div>
  );
};

export default CashierPOS;
