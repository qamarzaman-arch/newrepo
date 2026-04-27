import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Eye,
  Pencil,
  Plus,
  Receipt,
  Search,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMenuItems } from '../../hooks/useMenu';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import { useSettingsStore } from '../../stores/settingsStore';
import { orderService } from '../../services/orderService';
import { validationService } from '../../services/validationService';

type ActiveOrder = {
  id: string;
  orderNumber?: string;
  status: string;
  orderType: string;
  customerName?: string;
  table?: { number?: string };
  tableNumber?: string;
  notes?: string;
  subtotal?: number;
  totalAmount?: number;
  taxAmount?: number;
  createdAt?: string;
  orderedAt?: string;
  items: Array<{
    id?: string;
    menuItemId?: string;
    quantity: number;
    notes?: string;
    menuItem?: { id: string; name: string; price?: number };
    name?: string;
    price?: number;
  }>;
  payments?: Array<{ method?: string }>;
};

type EditableOrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
};

const CashierActiveOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();

  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editableItems, setEditableItems] = useState<EditableOrderItem[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ONLINE_TRANSFER'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [managerPin, setManagerPin] = useState('');

  const { data: menuItems = [] } = useMenuItems({
    search: menuSearch || undefined,
    available: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cashier-active-orders'],
    queryFn: async () => {
      const response = await orderService.getOrders({
        status: 'PENDING,PREPARING,READY',
        limit: 100,
      });

      return response.data.data.orders as ActiveOrder[];
    },
    refetchInterval: 5000,
  });

  const orders = data || [];

  const groupedOrders = useMemo(() => {
    return {
      PENDING: orders.filter((order) => order.status === 'PENDING'),
      PREPARING: orders.filter((order) => order.status === 'PREPARING'),
      READY: orders.filter((order) => order.status === 'READY'),
    };
  }, [orders]);

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const updateOrderMutation = useMutation({
    mutationFn: (payload: { orderId: string; items: EditableOrderItem[]; notes?: string }) =>
      orderService.modifyOrder(payload.orderId, {
        items: payload.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        notes: payload.notes,
        notifyKitchen: true,
      }),
    onSuccess: () => {
      toast.success('Order updated');
      refreshOrders();
      setShowEditModal(false);
      setSelectedOrder(null);
      setMenuSearch('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, reason }: { orderId: string; status: string; reason?: string }) =>
      orderService.updateStatus(orderId, status, reason),
    onSuccess: (_response, variables) => {
      toast.success(
        variables.status === 'READY'
          ? 'Order marked ready'
          : variables.status === 'COMPLETED'
          ? 'Order completed'
          : 'Order updated'
      );
      refreshOrders();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) => orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      refreshOrders();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) {
        throw new Error('Order not selected');
      }

      const orderTotal = selectedOrder.totalAmount ?? 0;
      const finalAmount = Math.max(orderTotal - discountAmount, 0);

      if (discountAmount > 0) {
        const isValid = await validationService.validateManagerPin(managerPin, 'apply_discount');
        if (!isValid) {
          throw new Error('Invalid manager PIN');
        }
      }

      await orderService.processPayment(selectedOrder.id, {
        method: paymentMethod,
        amount: finalAmount,
        cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived || '0') : undefined,
        cardLastFour: paymentMethod === 'CARD' ? cardLastFour || undefined : undefined,
        transferReference: paymentMethod === 'ONLINE_TRANSFER' ? transferReference || undefined : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
      });

      await orderService.updateStatus(selectedOrder.id, 'COMPLETED');
    },
    onSuccess: () => {
      toast.success('Payment collected');
      refreshOrders();
      setShowPaymentModal(false);
      setSelectedOrder(null);
      setCashReceived('');
      setCardLastFour('');
      setTransferReference('');
      setDiscountPercent('');
      setDiscountAmount(0);
      setManagerPin('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to collect payment');
    },
  });

  const openEditModal = (order: ActiveOrder) => {
    setSelectedOrder(order);
    setEditableItems(
      (order.items || []).map((item, index) => ({
        id: item.id || `${order.id}-${index}`,
        menuItemId: item.menuItemId || item.menuItem?.id || '',
        name: item.menuItem?.name || item.name || 'Item',
        quantity: item.quantity,
        price: item.price || item.menuItem?.price || 0,
        notes: item.notes || '',
      }))
    );
    setEditNotes(order.notes || '');
    setShowEditModal(true);
  };

  const addMenuItemToEdit = (item: any) => {
    setEditableItems((current) => {
      const existing = current.find((entry) => entry.menuItemId === item.id && !entry.notes);
      if (existing) {
        return current.map((entry) =>
          entry.menuItemId === item.id && !entry.notes
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }

      return [
        ...current,
        {
          id: `new-${item.id}-${Date.now()}`,
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          price: item.price,
          notes: '',
        },
      ];
    });
  };

  const getElapsedTime = (order: ActiveOrder) => {
    const source = order.createdAt || order.orderedAt;
    if (!source) return 'Unknown';

    const elapsedMs = Date.now() - new Date(source).getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DINE_IN: 'Dine-In',
      WALK_IN: 'Walk-In',
      TAKEAWAY: 'Take Away',
      PICKUP: 'Pickup',
      DELIVERY: 'Delivery',
      RESERVATION: 'Reservation',
    };
    return labels[type] || type.replace('_', ' ');
  };

  const getStatusClasses = (status: string) => {
    if (status === 'PENDING') return 'bg-warning-100 text-warning-700 border-2 border-warning-300';
    if (status === 'PREPARING') return 'bg-primary-100 text-primary-700 border-2 border-primary-300';
    return 'bg-success-100 text-success-700 border-2 border-success-300';
  };

  const renderOrderCard = (order: ActiveOrder) => {
    const total = order.totalAmount ?? 0;
    const tableNumber = order.table?.number || order.tableNumber;

    return (
      <motion.div
        key={order.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(229, 57, 53, 0.12)' }}
        className="rounded-3xl border-2 border-neutral-200 bg-neutral-0 p-6 shadow-lg"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xl font-black text-neutral-900">#{order.orderNumber || order.id.slice(-6)}</span>
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${getStatusClasses(order.status)}`}
              >
                {order.status}
              </motion.span>
            </div>
            <p className="text-sm text-neutral-600 font-medium">
              {getOrderTypeLabel(order.orderType)}
              {tableNumber ? ` • Table ${tableNumber}` : ''}
            </p>
            {order.customerName && <p className="mt-2 text-sm font-bold text-neutral-900">{order.customerName}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Elapsed</p>
            <p className="text-base font-black text-neutral-900">{getElapsedTime(order)}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-neutral-50 p-4 border-2 border-neutral-200">
          {(order.items || []).slice(0, 4).map((item, index) => (
            <div key={`${order.id}-${index}`} className="flex items-center justify-between text-sm text-neutral-700">
              <span className="font-semibold">
                {item.quantity}x {item.menuItem?.name || item.name || 'Item'}
              </span>
              <span className="font-bold text-neutral-900">{formatCurrency((item.price || item.menuItem?.price || 0) * item.quantity)}</span>
            </div>
          ))}
          {(order.items || []).length > 4 && (
            <p className="text-xs font-bold text-primary-600">+{order.items.length - 4} more items</p>
          )}
        </div>

        {order.notes && (
          <div className="mt-5 rounded-2xl border-2 border-warning-200 bg-warning-50 p-4 text-sm text-neutral-700">
            <span className="font-bold text-warning-800">Kitchen note:</span> {order.notes}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Total</p>
            <p className="text-3xl font-black text-primary-600">{formatCurrency(total)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton
              icon={<Eye className="h-4 w-4" />}
              label="View"
              onClick={() => {
                setSelectedOrder(order);
                setShowViewModal(true);
              }}
            />
            <ActionButton icon={<Pencil className="h-4 w-4" />} label="Edit" onClick={() => openEditModal(order)} />
            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
              <ActionButton
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Ready"
                variant="primary"
                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'READY' })}
              />
            )}
            {order.status === 'READY' && (
              <ActionButton
                icon={<Receipt className="h-4 w-4" />}
                label="Collect"
                variant="primary"
                onClick={() => {
                  setSelectedOrder(order);
                  setCashReceived(String(order.totalAmount || 0));
                  setShowPaymentModal(true);
                }}
              />
            )}
            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
              <ActionButton
                icon={<Trash2 className="h-4 w-4" />}
                label="Cancel"
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Cancel order #${order.orderNumber || order.id.slice(-6)}?`)) {
                    cancelOrderMutation.mutate({ orderId: order.id, reason: 'Cancelled by cashier' });
                  }
                }}
              />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-neutral-50">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="border-b-2 border-primary-100 bg-neutral-0 px-8 py-6 shadow-sm"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-600">Cashier Desk</p>
            <h1 className="mt-2 text-4xl font-black text-neutral-900">Active Orders</h1>
            <p className="mt-2 text-sm text-neutral-600 font-medium">Live order management with direct kitchen, payment, and cancellation actions.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Pending" value={groupedOrders.PENDING.length} />
            <SummaryCard label="Preparing" value={groupedOrders.PREPARING.length} />
            <SummaryCard label="Ready" value={groupedOrders.READY.length} />
          </div>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border-2 border-dashed border-neutral-300 bg-neutral-0 p-16 text-center"
          >
            <CheckCircle2 className="mb-6 h-20 w-20 text-primary-300" />
            <h2 className="text-3xl font-black text-neutral-900">No active orders</h2>
            <p className="mt-3 text-base text-neutral-600">New kitchen and ready-to-pay orders will appear here automatically.</p>
          </motion.div>
        ) : (
          <div className="space-y-10">
            <OrderSection title="Pending" accent="bg-warning-500" orders={groupedOrders.PENDING} renderOrderCard={renderOrderCard} />
            <OrderSection title="Preparing" accent="bg-primary-500" orders={groupedOrders.PREPARING} renderOrderCard={renderOrderCard} />
            <OrderSection title="Ready For Payment" accent="bg-success-500" orders={groupedOrders.READY} renderOrderCard={renderOrderCard} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showViewModal && selectedOrder && (
          <ModalShell title={`Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`} onClose={() => setShowViewModal(false)}>
            <div className="space-y-4">
              {(selectedOrder.items || []).map((item, index) => (
                <motion.div
                  key={`${selectedOrder.id}-view-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-2xl bg-neutral-50 p-5 border-2 border-neutral-200"
                >
                  <div>
                    <p className="font-bold text-neutral-900 text-lg">
                      {item.quantity}x {item.menuItem?.name || item.name}
                    </p>
                    {item.notes && <p className="mt-1 text-sm text-neutral-600 italic">"{item.notes}"</p>}
                  </div>
                  <p className="font-bold text-primary-600 text-lg">
                    {formatCurrency((item.price || item.menuItem?.price || 0) * item.quantity)}
                  </p>
                </motion.div>
              ))}

              {selectedOrder.notes && (
                <div className="rounded-2xl border-2 border-warning-200 bg-warning-50 p-5 text-sm text-neutral-700">
                  <span className="font-bold text-warning-800">Order notes:</span> {selectedOrder.notes}
                </div>
              )}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && selectedOrder && (
          <ModalShell title={`Edit Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`} onClose={() => setShowEditModal(false)} widthClass="max-w-5xl">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border-2 border-primary-200 bg-primary-50 p-6">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-600">Current Items</p>
                  <div className="space-y-4">
                    {editableItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl bg-neutral-0 p-5 shadow-sm border-2 border-neutral-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-neutral-900 text-lg">{item.name}</p>
                            <p className="text-sm text-neutral-600">{formatCurrency(item.price)} each</p>
                            <input
                              value={item.notes || ''}
                              onChange={(event) =>
                                setEditableItems((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id ? { ...entry, notes: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="Item note"
                              className="mt-3 w-full rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                            />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setEditableItems((current) => current.filter((entry) => entry.id !== item.id))}
                            className="rounded-xl bg-error-50 p-3 text-error-600 transition-colors hover:bg-error-100 border-2 border-error-200"
                          >
                            <Trash2 className="h-5 w-5" />
                          </motion.button>
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-xl bg-neutral-100 p-1.5 border-2 border-neutral-200">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setEditableItems((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
                                      : entry
                                  )
                                )
                              }
                              className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                            >
                              -
                            </motion.button>
                            <span className="min-w-[3rem] text-center font-bold text-neutral-900 text-lg">{item.quantity}</span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setEditableItems((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
                                  )
                                )
                              }
                              className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                            >
                              +
                            </motion.button>
                          </div>
                          <p className="font-bold text-primary-600 text-xl">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={4}
                  placeholder="Kitchen note or order note"
                  className="w-full rounded-3xl border-2 border-neutral-200 px-5 py-4 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                />

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      updateOrderMutation.mutate({
                        orderId: selectedOrder.id,
                        items: editableItems,
                        notes: editNotes,
                      })
                    }
                    disabled={updateOrderMutation.isPending || editableItems.length === 0}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 py-4 font-bold text-white transition-all hover:shadow-lg shadow-primary-500/30 disabled:opacity-50"
                  >
                    {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowEditModal(false)}
                    className="rounded-2xl bg-neutral-100 px-6 py-4 font-bold text-neutral-700 transition-colors hover:bg-neutral-200 border-2 border-neutral-200"
                  >
                    Close
                  </motion.button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border-2 border-primary-200 bg-neutral-0 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Search className="h-5 w-5 text-primary-600" />
                    <input
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      placeholder="Find menu item"
                      className="w-full border-none bg-transparent text-sm font-semibold outline-none text-neutral-900"
                    />
                  </div>
                  <div className="max-h-[420px] space-y-3 overflow-y-auto">
                    {menuItems.slice(0, 20).map((item: any) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(229, 57, 53, 0.05)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addMenuItemToEdit(item)}
                        className="flex w-full items-center justify-between rounded-2xl border-2 border-neutral-200 px-5 py-4 text-left transition-colors hover:border-primary-300 bg-neutral-50"
                      >
                        <div>
                          <p className="font-bold text-neutral-900">{item.name}</p>
                          <p className="text-sm text-neutral-600">{formatCurrency(item.price)}</p>
                        </div>
                        <span className="rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-3 text-white shadow-md">
                          <Plus className="h-4 w-4" />
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && selectedOrder && (
          <ModalShell title={`Collect Payment • #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`} onClose={() => setShowPaymentModal(false)} widthClass="max-w-lg">
            <div className="space-y-6">
              <div className="rounded-3xl border-2 border-primary-200 bg-primary-50 p-6">
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span className="font-semibold">Order total</span>
                  <span className="font-bold text-neutral-900 text-lg">{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="mt-3 flex items-center justify-between text-sm text-success-700">
                    <span className="font-semibold">Discount</span>
                    <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="mt-4 border-t-2 border-primary-200 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Amount To Collect</p>
                  <p className="mt-2 text-4xl font-black text-primary-600">
                    {formatCurrency(Math.max((selectedOrder.totalAmount || 0) - discountAmount, 0))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <PaymentMethodButton icon={<Banknote className="h-5 w-5" />} active={paymentMethod === 'CASH'} label="Cash" onClick={() => setPaymentMethod('CASH')} />
                <PaymentMethodButton icon={<CreditCard className="h-5 w-5" />} active={paymentMethod === 'CARD'} label="Card" onClick={() => setPaymentMethod('CARD')} />
                <PaymentMethodButton icon={<Smartphone className="h-5 w-5" />} active={paymentMethod === 'ONLINE_TRANSFER'} label="Transfer" onClick={() => setPaymentMethod('ONLINE_TRANSFER')} />
              </div>

              <div className="rounded-3xl border-2 border-neutral-200 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary-600">Optional Discount</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(event) => {
                      const nextPercent = event.target.value;
                      const numericPercent = Number(nextPercent || 0);
                      setDiscountPercent(nextPercent);
                      setDiscountAmount(((selectedOrder.totalAmount || 0) * numericPercent) / 100);
                    }}
                    placeholder="Discount %"
                    className="rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={managerPin}
                    onChange={(event) => setManagerPin(event.target.value)}
                    placeholder="Manager PIN"
                    className="rounded-xl border-2 border-neutral-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  />
                </div>
              </div>

              {paymentMethod === 'CASH' && (
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                  placeholder="Cash received"
                  className="w-full rounded-3xl border-2 border-neutral-200 px-6 py-4 text-lg font-bold focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                />
              )}

              {paymentMethod === 'CARD' && (
                <input
                  type="text"
                  maxLength={4}
                  value={cardLastFour}
                  onChange={(event) => setCardLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Card last 4 digits"
                  className="w-full rounded-3xl border-2 border-neutral-200 px-6 py-4 text-lg font-bold tracking-[0.3em] focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                />
              )}

              {paymentMethod === 'ONLINE_TRANSFER' && (
                <input
                  type="text"
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value.toUpperCase())}
                  placeholder="Transfer reference"
                  className="w-full rounded-3xl border-2 border-neutral-200 px-6 py-4 text-lg font-bold focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                />
              )}

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => processPaymentMutation.mutate()}
                disabled={
                  processPaymentMutation.isPending ||
                  (paymentMethod === 'CASH' &&
                    Number(cashReceived || 0) < Math.max((selectedOrder.totalAmount || 0) - discountAmount, 0)) ||
                  (paymentMethod === 'ONLINE_TRANSFER' && !transferReference.trim()) ||
                  (discountAmount > 0 && !managerPin.trim())
                }
                className="w-full rounded-3xl bg-gradient-to-r from-primary-600 to-primary-700 py-5 text-lg font-black text-white transition-all hover:shadow-lg shadow-primary-500/30 disabled:opacity-50"
              >
                {processPaymentMutation.isPending ? 'Processing Payment...' : 'Confirm Payment'}
              </motion.button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <motion.div
    whileHover={{ scale: 1.05, y: -2 }}
    className="rounded-2xl border-2 border-primary-200 bg-neutral-0 px-6 py-4 shadow-sm"
  >
    <p className="text-xs font-bold uppercase tracking-wider text-primary-600">{label}</p>
    <p className="mt-2 text-3xl font-black text-neutral-900">{value}</p>
  </motion.div>
);

const OrderSection: React.FC<{
  title: string;
  accent: string;
  orders: ActiveOrder[];
  renderOrderCard: (order: ActiveOrder) => React.ReactNode;
}> = ({ title, accent, orders, renderOrderCard }) => {
  if (orders.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center gap-4">
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`h-4 w-4 rounded-full ${accent} shadow-lg`}
        />
        <h2 className="text-2xl font-black text-neutral-900">{title}</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{orders.map((order) => renderOrderCard(order))}</div>
    </motion.section>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}> = ({ icon, label, onClick, variant = 'default' }) => {
  const variantClass =
    variant === 'primary'
      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg shadow-primary-500/30'
      : variant === 'danger'
      ? 'bg-gradient-to-r from-error-600 to-error-700 text-white hover:shadow-lg shadow-error-500/30'
      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick} 
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${variantClass}`}
    >
      {icon}
      {label}
    </motion.button>
  );
};

const PaymentMethodButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`rounded-2xl border-2 px-4 py-4 text-sm font-bold transition-all ${
      active 
        ? 'border-primary-600 bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30' 
        : 'border-neutral-200 bg-neutral-0 text-neutral-700 hover:border-primary-300 hover:bg-primary-50'
    }`}
  >
    <span className="mb-2 flex justify-center">{icon}</span>
    {label}
  </motion.button>
);

const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ title, onClose, widthClass = 'max-w-2xl', children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      className={`w-full ${widthClass} rounded-3xl bg-neutral-0 p-8 shadow-2xl border-2 border-primary-200`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600">Live Action</p>
          <h3 className="mt-2 text-3xl font-black text-neutral-900">{title}</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose} 
          className="rounded-2xl bg-error-50 p-3 text-error-600 transition-colors hover:bg-error-100 border-2 border-error-200"
        >
          <X className="h-6 w-6" />
        </motion.button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

export default CashierActiveOrders;
