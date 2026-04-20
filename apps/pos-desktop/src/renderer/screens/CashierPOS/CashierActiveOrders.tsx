import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Edit, Eye, X, Plus, Trash2, Send, CheckCircle, AlertCircle, Minus, Search, DollarSign, XCircle, CreditCard, Banknote, Smartphone, Tag, Percent } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { useMenuItems } from '../../hooks/useMenu';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import toast from 'react-hot-toast';
import { useActiveOrders } from './hooks/useActiveOrders';
import { usePaymentFlow } from './hooks/usePaymentFlow';
import { OrderCard } from './components/OrderCard';
import { PaymentModal } from './components/PaymentModal';
import { ModifyOrderModal } from './components/ModifyOrderModal';
import { ViewOrderModal } from './components/ViewOrderModal';

const CashierActiveOrders: React.FC = () => {
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyNotes, setModifyNotes] = useState('');
  const [modifiedItems, setModifiedItems] = useState<any[]>([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE_TRANSFER'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardLastFour, setCardLastFour] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [isValidatingPin, setIsValidatingPin] = useState(false);

  // Load menu items for adding to order
  const { data: menuItems } = useMenuItems({
    search: searchQuery || undefined,
    available: true,
  });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['cashier-active-orders'],
    queryFn: async () => {
      const response = await orderService.getOrders({
        status: 'PENDING,PREPARING,READY',
        limit: 100,
      });
      return response.data.data;
    },
    refetchInterval: 5000,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: any }) => {
      return await orderService.updateOrder(orderId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Order updated and kitchen notified');
      setShowModifyModal(false);
      setShowAddItemModal(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order');
    },
  });

  const markReadyMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await orderService.updateStatus(orderId, 'READY');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Order marked as ready');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      return await orderService.updateStatus(orderId, 'CANCELLED', reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Order cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });

  // Validate manager PIN for discount
  const validatePinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const response = await fetch('/api/v1/auth/validate-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ pin, operation: 'apply_discount' }),
      });
      return response.json();
    },
  });

  // Payment processing mutation
  const processPaymentMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      paymentData 
    }: { 
      orderId: string; 
      paymentData: { 
        method: string; 
        amount: number; 
        cashReceived?: number;
        cardLastFour?: string;
        transferReference?: string;
        discountAmount?: number;
        discountPercent?: number;
      } 
    }) => {
      return await orderService.processPayment(orderId, {
        method: paymentData.method,
        amount: paymentData.amount,
        cashReceived: paymentData.cashReceived,
        cardLastFour: paymentData.cardLastFour,
        transferReference: paymentData.transferReference,
        discountAmount: paymentData.discountAmount,
        discountPercent: paymentData.discountPercent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Payment processed successfully!');
      setShowPaymentModal(false);
      setPaymentOrder(null);
      setCashReceived('');
      setCardLastFour('');
      setTransferReference('');
      setDiscountPercent('');
      setDiscountAmount(0);
      setShowDiscountInput(false);
      setManagerPin('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Payment failed');
    },
  });

  const orders = ordersData?.orders || [];
  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o: any) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o: any) => o.status === 'READY');

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DINE_IN: 'Dine-In',
      WALK_IN: 'Walk-In',
      TAKEAWAY: 'Take Away',
      DELIVERY: 'Delivery',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      PREPARING: 'bg-blue-100 text-blue-700 border-blue-200',
      READY: 'bg-green-100 text-green-700 border-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const handleModifyOrder = () => {
    if (!selectedOrder) return;
    
    const itemsChanged = JSON.stringify(modifiedItems) !== JSON.stringify(selectedOrder.items);
    
    updateOrderMutation.mutate({
      orderId: selectedOrder.id,
      updates: {
        notes: modifyNotes,
        items: itemsChanged ? modifiedItems.map((item: any) => ({
          id: item.id,
          menuItemId: item.menuItemId || item.menuItem?.id,
          quantity: item.quantity,
          notes: item.notes,
        })) : undefined,
        notifyKitchen: itemsChanged,
      },
    });
  };

  const handleUpdateItemQuantity = (itemId: string, delta: number) => {
    setModifiedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setModifiedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleAddItem = (menuItem: any) => {
    const newItem = {
      id: `temp_${Date.now()}`,
      menuItemId: menuItem.id,
      menuItem: menuItem,
      quantity: 1,
      price: menuItem.price,
      notes: '',
    };
    setModifiedItems(prev => [...prev, newItem]);
    setShowAddItemModal(false);
    setSearchQuery('');
    toast.success(`${menuItem.name} added to order`);
  };

  const OrderCard = ({ order }: { order: any }) => {
    const isOverdue = Date.now() - new Date(order.createdAt).getTime() > 30 * 60000;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white rounded-xl p-4 border-2 transition-all ${
          isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-primary'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg text-gray-900">#{order.id.slice(-6)}</span>
              {isOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                {getOrderTypeLabel(order.orderType)}
              </span>
              {order.tableNumber && (
                <span className="text-xs text-gray-600">Table {order.tableNumber}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {getElapsedTime(order.createdAt)}
          </div>
        </div>

        {order.customerName && (
          <p className="text-sm text-gray-600 mb-2">Customer: {order.customerName}</p>
        )}

        <div className="space-y-1 mb-3">
          {order.items?.slice(0, 3).map((item: any, index: number) => (
            <div key={index} className="text-sm text-gray-700">
              <span className="font-semibold">{item.quantity}x</span> {item.menuItem?.name || item.name || 'Unknown'}
            </div>
          ))}
          {order.items?.length > 3 && (
            <p className="text-xs text-gray-500">+{order.items.length - 3} more items</p>
          )}
        </div>

        {order.notes && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 italic">&quot;{order.notes}&quot;</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="text-lg font-black text-primary">
            {formatCurrency(order.totalAmount ?? order.total ?? 0, settings.currency)}
          </span>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedOrder(order);
                setShowViewModal(true);
              }}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedOrder(order);
                setModifiedItems(order.items || []);
                setModifyNotes(order.notes || '');
                setShowModifyModal(true);
              }}
              className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
              title="Modify Order"
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </motion.button>
            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => markReadyMutation.mutate(order.id)}
                className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                title="Mark as Ready"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </motion.button>
            )}
            {order.status === 'READY' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Open payment modal directly instead of navigating
                  console.log('[CashierActiveOrders] Opening payment modal for order:', order.id);
                  setPaymentOrder(order);
                  setShowPaymentModal(true);
                  setCashReceived(order.totalAmount?.toString() || '');
                }}
                className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                title="Collect Payment"
              >
                <DollarSign className="w-4 h-4 text-primary" />
              </motion.button>
            )}
            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (window.confirm(`Cancel order #${order.id.slice(-6)}?`)) {
                    cancelOrderMutation.mutate({ orderId: order.id, reason: 'Cancelled by cashier' });
                  }
                }}
                className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                title="Cancel Order"
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              {orders.length} active order{orders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs font-semibold text-yellow-700">Pending: {pendingOrders.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-blue-700">Preparing: {preparingOrders.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-green-700">Ready: {readyOrders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <CheckCircle className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-semibold">No active orders</p>
            <p className="text-sm">All orders are completed</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  Pending Orders
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {preparingOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  Preparing Orders
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {preparingOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {readyOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Ready for Pickup
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modify Order Modal */}
      <AnimatePresence>
        {showModifyModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModifyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Modify Order</h2>
                <button
                  onClick={() => setShowModifyModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Modifying items will send an update notification to the kitchen staff.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Order Items
                    </label>
                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {modifiedItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {item.menuItem?.name || item.name || 'Unknown Item'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.price, settings.currency)} each
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
                          <button
                            onClick={() => handleUpdateItemQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4 text-gray-700" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateItemQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {modifiedItems.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No items in order</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Order Notes / Special Instructions
                  </label>
                  <textarea
                    value={modifyNotes}
                    onChange={(e) => setModifyNotes(e.target.value)}
                    placeholder="Add or update order notes..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowModifyModal(false);
                      setModifiedItems([]);
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleModifyOrder}
                    disabled={updateOrderMutation.isPending || modifiedItems.length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    {updateOrderMutation.isPending ? 'Updating...' : 'Update Order'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowAddItemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Item to Order</h2>
                <button
                  onClick={() => setShowAddItemModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {menuItems?.filter((item: any) => item.isAvailable).map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-primary transition-all text-left"
                  >
                    <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(item.price, settings.currency)}
                    </p>
                  </button>
                ))}
              </div>

              {menuItems?.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>No menu items found</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Order Details Modal */}
      <AnimatePresence>
        {showViewModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500">Order Type</p>
                    <p className="font-semibold text-gray-900">{selectedOrder.orderType?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-semibold text-gray-900">{selectedOrder.status}</p>
                  </div>
                  {selectedOrder.table?.number && (
                    <div>
                      <p className="text-xs text-gray-500">Table</p>
                      <p className="font-semibold text-gray-900">#{selectedOrder.table.number}</p>
                    </div>
                  )}
                  {selectedOrder.customerName && (
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.customerName}</p>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {item.quantity}x {item.menuItem?.name || item.name}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>
                          )}
                        </div>
                        <p className="font-semibold text-primary">
                          {formatCurrency(item.totalPrice || (item.unitPrice * item.quantity), settings.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.subtotal, settings.currency)}</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-semibold text-green-600">-{formatCurrency(selectedOrder.discountAmount, settings.currency)}</span>
                    </div>
                  )}
                  {selectedOrder.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-semibold">{formatCurrency(selectedOrder.taxAmount, settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(selectedOrder.totalAmount ?? selectedOrder.total, settings.currency)}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-xs text-yellow-800 font-semibold mb-1">Order Notes</p>
                    <p className="text-sm text-yellow-700">{selectedOrder.notes}</p>
                  </div>
                )}

                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && paymentOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-primary" />
                    Collect Payment
                  </h2>
                  <p className="text-sm text-gray-500">
                    Order #{paymentOrder.orderNumber || paymentOrder.id.slice(-6)}
                  </p>
                </div>
                <button
                  onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Apply Discount Button */}
              {!showDiscountInput && (
                <button
                  onClick={() => setShowDiscountInput(true)}
                  className="w-full mb-4 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary hover:text-primary transition-colors"
                >
                  <Tag className="w-5 h-5" />
                  <span className="font-semibold">Apply Discount</span>
                </button>
              )}

              {/* Discount Input */}
              {showDiscountInput && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-purple-900 flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Apply Discount
                    </span>
                    <button
                      onClick={() => {
                        setShowDiscountInput(false);
                        setDiscountPercent('');
                        setDiscountAmount(0);
                        setManagerPin('');
                      }}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={discountPercent}
                          onChange={(e) => {
                            const percent = parseFloat(e.target.value) || 0;
                            setDiscountPercent(e.target.value);
                            const subtotal = paymentOrder.subtotal || paymentOrder.totalAmount || 0;
                            setDiscountAmount((subtotal * percent) / 100);
                          }}
                          className="w-full pl-4 pr-8 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                          placeholder="0"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <div className="flex-1 flex items-center px-3 bg-white border border-purple-200 rounded-lg">
                        <span className="text-purple-700 font-semibold">
                          -{formatCurrency(discountAmount, settings.currency)}
                        </span>
                      </div>
                    </div>
                    
                    <input
                      type="password"
                      value={managerPin}
                      onChange={(e) => setManagerPin(e.target.value)}
                      className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      placeholder="Enter Manager PIN to confirm"
                      maxLength={6}
                    />
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(paymentOrder.subtotal, settings.currency)}</span>
                  </div>
                  {(paymentOrder.discountAmount > 0 || discountAmount > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount {discountPercent && `(${discountPercent}%)`}</span>
                      <span className="font-semibold text-green-600">
                        -{formatCurrency((paymentOrder.discountAmount || 0) + discountAmount, settings.currency)}
                      </span>
                    </div>
                  )}
                  {paymentOrder.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-semibold">{formatCurrency(paymentOrder.taxAmount, settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-primary">
                      {formatCurrency(
                        (paymentOrder.totalAmount ?? paymentOrder.total ?? 0) - discountAmount, 
                        settings.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4 mb-6">
                <p className="text-sm font-semibold text-gray-700">Payment Method</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="font-semibold text-sm">Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-semibold text-sm">Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('ONLINE_TRANSFER')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'ONLINE_TRANSFER'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="font-semibold text-sm">Transfer</span>
                  </button>
                </div>
              </div>

              {/* Cash Payment Fields */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cash Received
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : ''}
                      </span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg font-semibold"
                        placeholder="0.00"
                        min={paymentOrder.totalAmount}
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2">
                    {[10, 20, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCashReceived(amount.toString())}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors"
                      >
                        {formatCurrency(amount, settings.currency)}
                      </button>
                    ))}
                    <button
                      onClick={() => setCashReceived(paymentOrder.totalAmount?.toString() || '')}
                      className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-colors"
                    >
                      Exact
                    </button>
                  </div>

                  {/* Change Calculation */}
                  {parseFloat(cashReceived) > paymentOrder.totalAmount && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-800 font-semibold">Change Due</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(parseFloat(cashReceived) - paymentOrder.totalAmount, settings.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Payment Fields */}
              {paymentMethod === 'CARD' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Last 4 Digits (Optional)
                    </label>
                    <input
                      type="text"
                      value={cardLastFour}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCardLastFour(value);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg font-semibold tracking-widest"
                      placeholder="••••"
                      maxLength={4}
                    />
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Card Payment</span> - Total amount {formatCurrency((paymentOrder.totalAmount ?? 0) - discountAmount, settings.currency)} will be charged.
                    </p>
                  </div>
                </div>
              )}

              {/* Online Transfer Payment Fields */}
              {paymentMethod === 'ONLINE_TRANSFER' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer Reference Number *
                    </label>
                    <input
                      type="text"
                      value={transferReference}
                      onChange={(e) => setTransferReference(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg font-semibold uppercase"
                      placeholder="e.g., TRX123456"
                    />
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-sm text-purple-800">
                      <span className="font-semibold">Online Transfer</span> - Amount {formatCurrency((paymentOrder.totalAmount ?? 0) - discountAmount, settings.currency)} via bank/JazzCash/EasyPaisa.
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Enter the transaction reference number from the transfer.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Validate PIN if discount is being applied
                    if (discountAmount > 0 && managerPin) {
                      setIsValidatingPin(true);
                      const result = await validatePinMutation.mutateAsync(managerPin);
                      setIsValidatingPin(false);
                      if (!result.data?.valid) {
                        toast.error('Invalid manager PIN');
                        return;
                      }
                    }
                    
                    setIsProcessingPayment(true);
                    const finalAmount = (paymentOrder.totalAmount ?? paymentOrder.total ?? 0) - discountAmount;
                    
                    processPaymentMutation.mutate(
                      {
                        orderId: paymentOrder.id,
                        paymentData: {
                          method: paymentMethod,
                          amount: finalAmount,
                          cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : undefined,
                          cardLastFour: paymentMethod === 'CARD' ? cardLastFour : undefined,
                          transferReference: paymentMethod === 'ONLINE_TRANSFER' ? transferReference : undefined,
                          discountAmount: discountAmount > 0 ? discountAmount : undefined,
                          discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
                        },
                      },
                      {
                        onSettled: () => setIsProcessingPayment(false),
                      }
                    );
                  }}
                  disabled={
                    isProcessingPayment ||
                    isValidatingPin ||
                    (paymentMethod === 'CASH' && parseFloat(cashReceived) < ((paymentOrder.totalAmount ?? 0) - discountAmount)) ||
                    (paymentMethod === 'ONLINE_TRANSFER' && !transferReference.trim()) ||
                    (discountAmount > 0 && !managerPin.trim())
                  }
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessingPayment || isValidatingPin ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isValidatingPin ? 'Validating PIN...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete Payment
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CashierActiveOrders;
