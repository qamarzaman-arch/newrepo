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
    if (status === 'PENDING') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (status === 'PREPARING') return 'bg-white text-red-700 ring-1 ring-red-200';
    return 'bg-red-700 text-white';
  };

  const renderOrderCard = (order: ActiveOrder) => {
    const total = order.totalAmount ?? 0;
    const tableNumber = order.table?.number || order.tableNumber;

    return (
      <motion.div
        key={order.id}
        layout
        className="rounded-[28px] border border-red-100 bg-white p-5 shadow-[0_24px_60px_rgba(153,27,27,0.08)]"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg font-black text-gray-900">#{order.orderNumber || order.id.slice(-6)}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${getStatusClasses(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {getOrderTypeLabel(order.orderType)}
              {tableNumber ? ` • Table ${tableNumber}` : ''}
            </p>
            {order.customerName && <p className="mt-1 text-sm font-medium text-gray-700">{order.customerName}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Elapsed</p>
            <p className="text-sm font-bold text-gray-700">{getElapsedTime(order)}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-red-50/60 p-3">
          {(order.items || []).slice(0, 4).map((item, index) => (
            <div key={`${order.id}-${index}`} className="flex items-center justify-between text-sm text-gray-700">
              <span>
                {item.quantity}x {item.menuItem?.name || item.name || 'Item'}
              </span>
              <span className="font-semibold">{formatCurrency((item.price || item.menuItem?.price || 0) * item.quantity)}</span>
            </div>
          ))}
          {(order.items || []).length > 4 && (
            <p className="text-xs font-semibold text-red-600">+{order.items.length - 4} more items</p>
          )}
        </div>

        {order.notes && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-white p-3 text-sm text-gray-600">
            <span className="font-semibold text-red-700">Kitchen note:</span> {order.notes}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Total</p>
            <p className="text-2xl font-black text-red-700">{formatCurrency(total)}</p>
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
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_34%,#fff1f2_100%)]">
      <div className="border-b border-red-100 bg-white/90 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">Cashier Desk</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Active Orders</h1>
            <p className="mt-1 text-sm text-gray-500">Live order management with direct kitchen, payment, and cancellation actions.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Pending" value={groupedOrders.PENDING.length} />
            <SummaryCard label="Preparing" value={groupedOrders.PREPARING.length} />
            <SummaryCard label="Ready" value={groupedOrders.READY.length} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-200 border-t-red-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-[32px] border border-dashed border-red-200 bg-white p-12 text-center">
            <CheckCircle2 className="mb-4 h-16 w-16 text-red-200" />
            <h2 className="text-2xl font-black text-gray-900">No active orders</h2>
            <p className="mt-2 text-sm text-gray-500">New kitchen and ready-to-pay orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <OrderSection title="Pending" accent="bg-red-500" orders={groupedOrders.PENDING} renderOrderCard={renderOrderCard} />
            <OrderSection title="Preparing" accent="bg-red-300" orders={groupedOrders.PREPARING} renderOrderCard={renderOrderCard} />
            <OrderSection title="Ready For Payment" accent="bg-red-700" orders={groupedOrders.READY} renderOrderCard={renderOrderCard} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showViewModal && selectedOrder && (
          <ModalShell title={`Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`} onClose={() => setShowViewModal(false)}>
            <div className="space-y-4">
              {(selectedOrder.items || []).map((item, index) => (
                <div key={`${selectedOrder.id}-view-${index}`} className="flex items-center justify-between rounded-2xl bg-red-50 p-4">
                  <div>
                    <p className="font-bold text-gray-900">
                      {item.quantity}x {item.menuItem?.name || item.name}
                    </p>
                    {item.notes && <p className="mt-1 text-sm text-gray-500">{item.notes}</p>}
                  </div>
                  <p className="font-bold text-red-700">
                    {formatCurrency((item.price || item.menuItem?.price || 0) * item.quantity)}
                  </p>
                </div>
              ))}

              {selectedOrder.notes && (
                <div className="rounded-2xl border border-red-100 p-4 text-sm text-gray-600">
                  <span className="font-semibold text-red-700">Order notes:</span> {selectedOrder.notes}
                </div>
              )}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && selectedOrder && (
          <ModalShell title={`Edit Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`} onClose={() => setShowEditModal(false)} widthClass="max-w-4xl">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-red-100 bg-red-50 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-red-500">Current Items</p>
                  <div className="space-y-3">
                    {editableItems.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">{formatCurrency(item.price)} each</p>
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
                              className="mt-3 w-full rounded-xl border border-red-100 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => setEditableItems((current) => current.filter((entry) => entry.id !== item.id))}
                            className="rounded-xl bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-1">
                            <button
                              onClick={() =>
                                setEditableItems((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
                                      : entry
                                  )
                                )
                              }
                              className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-700"
                            >
                              -
                            </button>
                            <span className="min-w-[3rem] text-center font-bold text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() =>
                                setEditableItems((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
                                  )
                                )
                              }
                              className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-700"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-bold text-red-700">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={4}
                  placeholder="Kitchen note or order note"
                  className="w-full rounded-[24px] border border-red-100 px-4 py-3 text-sm focus:border-red-400 focus:outline-none"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      updateOrderMutation.mutate({
                        orderId: selectedOrder.id,
                        items: editableItems,
                        notes: editNotes,
                      })
                    }
                    disabled={updateOrderMutation.isPending || editableItems.length === 0}
                    className="flex-1 rounded-2xl bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="rounded-2xl bg-gray-100 px-5 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-red-100 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4 text-red-500" />
                    <input
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      placeholder="Find menu item"
                      className="w-full border-none bg-transparent text-sm outline-none"
                    />
                  </div>
                  <div className="max-h-[420px] space-y-2 overflow-y-auto">
                    {menuItems.slice(0, 20).map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => addMenuItemToEdit(item)}
                        className="flex w-full items-center justify-between rounded-2xl border border-red-100 px-4 py-3 text-left transition-colors hover:bg-red-50"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                        </div>
                        <span className="rounded-full bg-red-600 p-2 text-white">
                          <Plus className="h-4 w-4" />
                        </span>
                      </button>
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
            <div className="space-y-5">
              <div className="rounded-[28px] border border-red-100 bg-red-50 p-5">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Order total</span>
                  <span className="font-bold text-gray-900">{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm text-red-700">
                    <span>Discount</span>
                    <span className="font-bold">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="mt-3 border-t border-red-100 pt-3">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">Amount To Collect</p>
                  <p className="mt-1 text-3xl font-black text-red-700">
                    {formatCurrency(Math.max((selectedOrder.totalAmount || 0) - discountAmount, 0))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <PaymentMethodButton icon={<Banknote className="h-5 w-5" />} active={paymentMethod === 'CASH'} label="Cash" onClick={() => setPaymentMethod('CASH')} />
                <PaymentMethodButton icon={<CreditCard className="h-5 w-5" />} active={paymentMethod === 'CARD'} label="Card" onClick={() => setPaymentMethod('CARD')} />
                <PaymentMethodButton icon={<Smartphone className="h-5 w-5" />} active={paymentMethod === 'ONLINE_TRANSFER'} label="Transfer" onClick={() => setPaymentMethod('ONLINE_TRANSFER')} />
              </div>

              <div className="rounded-[28px] border border-red-100 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-red-500">Optional Discount</p>
                <div className="grid gap-3 sm:grid-cols-2">
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
                    className="rounded-xl border border-red-100 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={managerPin}
                    onChange={(event) => setManagerPin(event.target.value)}
                    placeholder="Manager PIN"
                    className="rounded-xl border border-red-100 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                  />
                </div>
              </div>

              {paymentMethod === 'CASH' && (
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                  placeholder="Cash received"
                  className="w-full rounded-[24px] border border-red-100 px-4 py-3 text-lg font-bold focus:border-red-400 focus:outline-none"
                />
              )}

              {paymentMethod === 'CARD' && (
                <input
                  type="text"
                  maxLength={4}
                  value={cardLastFour}
                  onChange={(event) => setCardLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Card last 4 digits"
                  className="w-full rounded-[24px] border border-red-100 px-4 py-3 text-lg font-bold tracking-[0.3em] focus:border-red-400 focus:outline-none"
                />
              )}

              {paymentMethod === 'ONLINE_TRANSFER' && (
                <input
                  type="text"
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value.toUpperCase())}
                  placeholder="Transfer reference"
                  className="w-full rounded-[24px] border border-red-100 px-4 py-3 text-lg font-bold focus:border-red-400 focus:outline-none"
                />
              )}

              <button
                onClick={() => processPaymentMutation.mutate()}
                disabled={
                  processPaymentMutation.isPending ||
                  (paymentMethod === 'CASH' &&
                    Number(cashReceived || 0) < Math.max((selectedOrder.totalAmount || 0) - discountAmount, 0)) ||
                  (paymentMethod === 'ONLINE_TRANSFER' && !transferReference.trim()) ||
                  (discountAmount > 0 && !managerPin.trim())
                }
                className="w-full rounded-[24px] bg-red-600 py-4 text-lg font-black text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {processPaymentMutation.isPending ? 'Processing Payment...' : 'Confirm Payment'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-[24px] border border-red-100 bg-white px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
  </div>
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
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${accent}`} />
        <h2 className="text-xl font-black text-gray-900">{title}</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{orders.map((order) => renderOrderCard(order))}</div>
    </section>
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
      ? 'bg-red-600 text-white hover:bg-red-700'
      : variant === 'danger'
      ? 'bg-red-950 text-white hover:bg-black'
      : 'bg-red-50 text-red-700 hover:bg-red-100';

  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition-colors ${variantClass}`}>
      {icon}
      {label}
    </button>
  );
};

const PaymentMethodButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-[24px] border px-4 py-4 text-sm font-bold transition-all ${
      active ? 'border-red-600 bg-red-600 text-white' : 'border-red-100 bg-white text-red-700 hover:bg-red-50'
    }`}
  >
    <span className="mb-2 flex justify-center">{icon}</span>
    {label}
  </button>
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
      className={`w-full ${widthClass} rounded-[36px] bg-white p-6 shadow-2xl`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-500">Live Action</p>
          <h3 className="mt-2 text-2xl font-black text-gray-900">{title}</h3>
        </div>
        <button onClick={onClose} className="rounded-2xl bg-red-50 p-3 text-red-700 transition-colors hover:bg-red-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

export default CashierActiveOrders;
