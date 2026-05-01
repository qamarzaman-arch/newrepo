import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Eye,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Printer,
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
import { getHardwareManager } from '../../services/hardwareManager';

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
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
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

      // Only update status if order is not already COMPLETED to avoid transition error
      if (selectedOrder.status !== 'COMPLETED') {
        await orderService.updateStatus(selectedOrder.id, 'COMPLETED');
      }
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
    if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (status === 'PREPARING') return 'bg-blue-50 text-blue-700 border border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  };

  // Left-border accent per status
  const getCardBorderAccent = (status: string) => {
    if (status === 'PENDING') return 'border-l-4 border-l-amber-400';
    if (status === 'PREPARING') return 'border-l-4 border-l-blue-500';
    return 'border-l-4 border-l-emerald-500';
  };

  const handlePrintReceipt = async (order: ActiveOrder) => {
    setPrintingOrderId(order.id);
    try {
      // Fetch full order detail (with payments, customer, etc.)
      const response = await orderService.reprintBill(order.id);
      const fullOrder = response.data.data.order;

      const items = (fullOrder.items || []).map((item: any) => ({
        name: item.menuItem?.name || item.name || 'Item',
        quantity: item.quantity,
        price: Number(item.unitPrice ?? item.price ?? item.menuItem?.price ?? 0),
        notes: item.notes,
      }));

      const subtotal = items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      );

      const tax = Number(fullOrder.taxAmount ?? 0);
      const discount = Number(fullOrder.discountAmount ?? 0);
      const total = Number(fullOrder.totalAmount ?? subtotal + tax - discount);
      const lastPayment = fullOrder.payments?.[fullOrder.payments.length - 1];

      const hw = getHardwareManager();
      await hw.printReceipt({
        restaurantName: settings.restaurantName || 'POSLytic Restaurant',
        restaurantAddress: settings.address || '',
        restaurantPhone: settings.phone || '',
        orderNumber: fullOrder.orderNumber || order.orderNumber || order.id.slice(-6),
        cashierName: fullOrder.cashier?.fullName || 'Cashier',
        items,
        subtotal,
        tax,
        taxRate: settings.taxRate || 0,
        discount,
        total,
        paymentMethod: lastPayment?.method || 'PENDING',
        change: lastPayment?.changeGiven ? Number(lastPayment.changeGiven) : 0,
      });
      toast.success('Receipt sent to printer');
    } catch (error: any) {
      console.error('Print receipt failed:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to print receipt');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const renderOrderCard = (order: ActiveOrder) => {
    const total = order.totalAmount ?? 0;
    const tableNumber = order.table?.number || order.tableNumber;

    return (
      <motion.div
        key={order.id}
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(211,47,47,0.10)' }}
        className={`rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden ${getCardBorderAccent(order.status)}`}
      >
        {/* Card header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-neutral-900 dark:text-neutral-100">
                #{order.orderNumber || order.id.slice(-6)}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusClasses(order.status)}`}>
                {order.status}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 dark:border-neutral-700">
                {getOrderTypeLabel(order.orderType)}
                {tableNumber ? ` · T${tableNumber}` : ''}
              </span>
            </div>
            {order.customerName && (
              <p className="mt-1 text-sm font-semibold text-neutral-700 truncate">{order.customerName}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Elapsed</p>
            <p className="text-sm font-black text-neutral-800">{getElapsedTime(order)}</p>
          </div>
        </div>

        {/* Items list */}
        <div className="mx-5 mb-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 space-y-1.5">
          {(order.items || []).slice(0, 4).map((item, index) => (
            <div key={`${order.id}-${index}`} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 font-medium">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{item.quantity}×</span>{' '}
                {item.menuItem?.name || item.name || 'Item'}
              </span>
              <span className="font-bold text-neutral-800 ml-2 flex-shrink-0">
                {formatCurrency((item.price || item.menuItem?.price || 0) * item.quantity)}
              </span>
            </div>
          ))}
          {(order.items || []).length > 4 && (
            <p className="text-xs font-bold text-primary-600 pt-0.5">+{order.items.length - 4} more items</p>
          )}
        </div>

        {/* Kitchen note */}
        {order.notes && (
          <div className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-bold">Note:</span> {order.notes}
          </div>
        )}

        {/* Footer: total + actions */}
        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Total</p>
            <p className="text-2xl font-black text-primary-600 leading-tight">{formatCurrency(total)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <ActionButton
              icon={<Eye className="h-3.5 w-3.5" />}
              label="View"
              onClick={() => {
                setSelectedOrder(order);
                setShowViewModal(true);
              }}
            />
            <ActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={() => openEditModal(order)} />
            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
              <ActionButton
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Ready"
                variant="primary"
                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'READY' })}
              />
            )}
            {order.status === 'READY' && (
              <ActionButton
                icon={<Receipt className="h-3.5 w-3.5" />}
                label="Collect Payment"
                variant="collect"
                onClick={() => {
                  setSelectedOrder(order);
                  setCashReceived(String(order.totalAmount || 0));
                  setShowPaymentModal(true);
                }}
              />
            )}
            <ActionButton
              icon={<Printer className="h-3.5 w-3.5" />}
              label={printingOrderId === order.id ? 'Printing…' : 'Print'}
              onClick={() => handlePrintReceipt(order)}
              disabled={printingOrderId === order.id}
            />
            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
              <ActionButton
                icon={<Trash2 className="h-3.5 w-3.5" />}
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
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* ── Header ── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-4 shadow-sm flex-shrink-0"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-600">Cashier Desk</p>
            <h1 className="mt-0.5 text-2xl font-black text-neutral-900 dark:text-neutral-100">Active Orders</h1>
          </div>

          {/* Stats pills + view toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatPill
              label="Pending"
              count={groupedOrders.PENDING.length}
              dotClass="bg-amber-400"
              pillClass="bg-amber-50 border-amber-200 text-amber-800"
            />
            <StatPill
              label="Preparing"
              count={groupedOrders.PREPARING.length}
              dotClass="bg-blue-500"
              pillClass="bg-blue-50 border-blue-200 text-blue-800"
            />
            <StatPill
              label="Ready"
              count={groupedOrders.READY.length}
              dotClass="bg-emerald-500"
              pillClass="bg-emerald-50 border-emerald-200 text-emerald-800"
            />

            <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl ml-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          /* Skeleton loading */
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-5 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-neutral-200 rounded" />
                    <div className="h-3 w-16 bg-neutral-100 rounded" />
                  </div>
                  <div className="h-4 w-12 bg-neutral-200 rounded" />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full bg-neutral-100 rounded" />
                  <div className="h-3 w-3/4 bg-neutral-100 rounded" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-6 w-16 bg-neutral-200 rounded" />
                  <div className="flex gap-2">
                    <div className="h-7 w-14 bg-neutral-100 rounded-lg" />
                    <div className="h-7 w-14 bg-neutral-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-neutral-300 bg-white dark:bg-neutral-800 p-12 text-center mt-8"
          >
            <div className="w-16 h-16 rounded-full bg-primary-50 border-2 border-primary-100 dark:border-neutral-700 flex items-center justify-center mb-5">
              <CheckCircle2 className="h-8 w-8 text-primary-400" />
            </div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100">All clear</h2>
            <p className="mt-2 text-sm text-neutral-500 font-medium">
              New kitchen and ready-to-pay orders will appear here automatically.
            </p>
          </motion.div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-8">
            <OrderSection
              title="Pending"
              dotClass="bg-amber-400"
              orders={groupedOrders.PENDING}
              renderOrderCard={renderOrderCard}
            />
            <OrderSection
              title="Preparing"
              dotClass="bg-blue-500"
              orders={groupedOrders.PREPARING}
              renderOrderCard={renderOrderCard}
            />
            <OrderSection
              title="Ready for Payment"
              dotClass="bg-emerald-500"
              orders={groupedOrders.READY}
              renderOrderCard={renderOrderCard}
            />
          </div>
        ) : (
          // ── List view ──
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                    {['Order #', 'Type', 'Customer / Table', 'Items', 'Total', 'Status', 'Elapsed', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {orders.map(order => {
                    const tableNumber = order.table?.number || order.tableNumber;
                    const itemCount = (order.items || []).reduce((s, i) => s + i.quantity, 0);
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">#{order.orderNumber || order.id.slice(-6)}</td>
                        <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{getOrderTypeLabel(order.orderType)}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {order.customerName || (tableNumber ? `Table ${tableNumber}` : 'Walk-in')}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{itemCount} item{itemCount === 1 ? '' : 's'}</td>
                        <td className="px-4 py-3 font-bold text-primary-600 whitespace-nowrap">{formatCurrency(order.totalAmount ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusClasses(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{getElapsedTime(order)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <ActionButton
                              icon={<Eye className="h-3.5 w-3.5" />}
                              label="View"
                              onClick={() => { setSelectedOrder(order); setShowViewModal(true); }}
                            />
                            <ActionButton
                              icon={<Pencil className="h-3.5 w-3.5" />}
                              label="Edit"
                              onClick={() => openEditModal(order)}
                            />
                            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                              <ActionButton
                                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                label="Ready"
                                variant="primary"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'READY' })}
                              />
                            )}
                            {order.status === 'READY' && (
                              <ActionButton
                                icon={<Receipt className="h-3.5 w-3.5" />}
                                label="Pay"
                                variant="collect"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCashReceived(String(order.totalAmount || 0));
                                  setShowPaymentModal(true);
                                }}
                              />
                            )}
                            <ActionButton
                              icon={<Printer className="h-3.5 w-3.5" />}
                              label={printingOrderId === order.id ? '…' : 'Print'}
                              onClick={() => handlePrintReceipt(order)}
                              disabled={printingOrderId === order.id}
                            />
                            {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                              <ActionButton
                                icon={<Trash2 className="h-3.5 w-3.5" />}
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── View Modal ── */}
      <AnimatePresence>
        {showViewModal && selectedOrder && (
          <ModalShell
            title={`Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`}
            onClose={() => setShowViewModal(false)}
          >
            <div className="space-y-3">
              {(selectedOrder.items || []).map((item, index) => (
                <motion.div
                  key={`${selectedOrder.id}-view-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center justify-between rounded-xl bg-neutral-50 dark:bg-neutral-900 px-4 py-3 border border-neutral-200 dark:border-neutral-700"
                >
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-neutral-100">
                      {item.quantity}× {item.menuItem?.name || item.name}
                    </p>
                    {item.notes && (
                      <p className="mt-0.5 text-xs text-neutral-500 italic">"{item.notes}"</p>
                    )}
                  </div>
                  <p className="font-bold text-primary-600">
                    {formatCurrency((item.price || item.menuItem?.price || 0) * item.quantity)}
                  </p>
                </motion.div>
              ))}

              {selectedOrder.notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <span className="font-bold">Note:</span> {selectedOrder.notes}
                </div>
              )}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {showEditModal && selectedOrder && (
          <ModalShell
            title={`Edit Order #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`}
            onClose={() => setShowEditModal(false)}
            widthClass="max-w-5xl"
          >
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-primary-200 dark:border-neutral-700 bg-primary-50 p-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary-600">Current Items</p>
                  <div className="space-y-3">
                    {editableItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl bg-white dark:bg-neutral-800 p-4 shadow-sm border border-neutral-200 dark:border-neutral-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-neutral-900 dark:text-neutral-100">{item.name}</p>
                            <p className="text-xs text-neutral-500">{formatCurrency(item.price)} each</p>
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
                              className="mt-2 w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                            />
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              setEditableItems((current) => current.filter((entry) => entry.id !== item.id))
                            }
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 border border-red-200 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 border border-neutral-200 dark:border-neutral-700">
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
                              className="rounded-md bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 shadow-sm"
                            >
                              −
                            </motion.button>
                            <span className="min-w-[2.5rem] text-center font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                              {item.quantity}
                            </span>
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
                              className="rounded-md bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 shadow-sm"
                            >
                              +
                            </motion.button>
                          </div>
                          <p className="font-bold text-primary-600">
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
                  rows={3}
                  placeholder="Kitchen note or order note"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                />

                <div className="flex gap-3">
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
                    className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3 font-bold text-white transition-all hover:shadow-md disabled:opacity-50"
                  >
                    {updateOrderMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowEditModal(false)}
                    className="rounded-xl bg-neutral-100 px-5 py-3 font-bold text-neutral-700 hover:bg-neutral-200 border border-neutral-200 dark:border-neutral-700"
                  >
                    Close
                  </motion.button>
                </div>
              </div>

              {/* Menu search */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                  <div className="mb-3 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-3">
                    <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <input
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      placeholder="Find menu item…"
                      className="w-full border-none bg-transparent text-sm outline-none text-neutral-900 dark:text-neutral-100 font-medium"
                    />
                  </div>
                  <div className="max-h-[380px] space-y-2 overflow-y-auto">
                    {menuItems.slice(0, 20).map((item: any) => (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(211,47,47,0.04)' }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => addMenuItemToEdit(item)}
                        className="flex w-full items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-left hover:border-primary-300 bg-neutral-50 dark:bg-neutral-900 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{item.name}</p>
                          <p className="text-xs text-neutral-500">{formatCurrency(item.price)}</p>
                        </div>
                        <span className="rounded-full bg-gradient-to-r from-primary-600 to-primary-500 p-2 text-white shadow-sm flex-shrink-0">
                          <Plus className="h-3.5 w-3.5" />
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

      {/* ── Payment Modal ── */}
      <AnimatePresence>
        {showPaymentModal && selectedOrder && (
          <ModalShell
            title={`Collect Payment · #${selectedOrder.orderNumber || selectedOrder.id.slice(-6)}`}
            onClose={() => setShowPaymentModal(false)}
            widthClass="max-w-md"
          >
            <div className="space-y-5">
              {/* Amount summary */}
              <div className="rounded-2xl border border-primary-200 dark:border-neutral-700 bg-primary-50 p-5">
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span className="font-semibold">Order total</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm text-emerald-700">
                    <span className="font-semibold">Discount</span>
                    <span className="font-bold">−{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="mt-3 border-t border-primary-200 dark:border-neutral-700 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Amount to Collect</p>
                  <p className="mt-1 text-4xl font-black text-primary-600">
                    {formatCurrency(Math.max((selectedOrder.totalAmount || 0) - discountAmount, 0))}
                  </p>
                </div>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-3 gap-3">
                <PaymentMethodButton
                  icon={<Banknote className="h-5 w-5" />}
                  active={paymentMethod === 'CASH'}
                  label="Cash"
                  onClick={() => setPaymentMethod('CASH')}
                />
                <PaymentMethodButton
                  icon={<CreditCard className="h-5 w-5" />}
                  active={paymentMethod === 'CARD'}
                  label="Card"
                  onClick={() => setPaymentMethod('CARD')}
                />
                <PaymentMethodButton
                  icon={<Smartphone className="h-5 w-5" />}
                  active={paymentMethod === 'ONLINE_TRANSFER'}
                  label="Transfer"
                  onClick={() => setPaymentMethod('ONLINE_TRANSFER')}
                />
              </div>

              {/* Optional discount */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-primary-600">Optional Discount</p>
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
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={managerPin}
                    onChange={(event) => setManagerPin(event.target.value)}
                    placeholder="Manager PIN"
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                  />
                </div>
              </div>

              {paymentMethod === 'CASH' && (
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                  placeholder="Cash received"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-3.5 text-lg font-bold focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                />
              )}

              {paymentMethod === 'CARD' && (
                <input
                  type="text"
                  maxLength={4}
                  value={cardLastFour}
                  onChange={(event) =>
                    setCardLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="Card last 4 digits"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-3.5 text-lg font-bold tracking-[0.3em] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                />
              )}

              {paymentMethod === 'ONLINE_TRANSFER' && (
                <input
                  type="text"
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value.toUpperCase())}
                  placeholder="Transfer reference"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-3.5 text-lg font-bold focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none"
                />
              )}

              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => processPaymentMutation.mutate()}
                disabled={
                  processPaymentMutation.isPending ||
                  (paymentMethod === 'CASH' &&
                    Number(cashReceived || 0) <
                      Math.max((selectedOrder.totalAmount || 0) - discountAmount, 0)) ||
                  (paymentMethod === 'ONLINE_TRANSFER' && !transferReference.trim()) ||
                  (discountAmount > 0 && !managerPin.trim())
                }
                className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-4 text-base font-black text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/40 disabled:opacity-50"
              >
                {processPaymentMutation.isPending ? 'Processing…' : 'Confirm Payment'}
              </motion.button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Sub-components ── */

const StatPill: React.FC<{
  label: string;
  count: number;
  dotClass: string;
  pillClass: string;
}> = ({ label, count, dotClass, pillClass }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${pillClass}`}>
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
    {label}
    <span className="ml-0.5 font-black">{count}</span>
  </div>
);

const OrderSection: React.FC<{
  title: string;
  dotClass: string;
  orders: ActiveOrder[];
  renderOrderCard: (order: ActiveOrder) => React.ReactNode;
}> = ({ title, dotClass, orders, renderOrderCard }) => {
  if (orders.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="mb-4 flex items-center gap-2.5">
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
        />
        <h2 className="text-base font-black text-neutral-800 uppercase tracking-wide">{title}</h2>
        <span className="text-xs font-bold text-neutral-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => renderOrderCard(order))}
      </div>
    </motion.section>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'collect' | 'danger';
  disabled?: boolean;
}> = ({ icon, label, onClick, variant = 'default', disabled = false }) => {
  const variantClass =
    variant === 'collect'
      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm shadow-primary-500/30 hover:shadow-md'
      : variant === 'primary'
      ? 'bg-neutral-800 text-white hover:bg-neutral-700'
      : variant === 'danger'
      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200';

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClass}`}
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
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`rounded-xl border px-3 py-3.5 text-sm font-bold transition-all ${
      active
        ? 'border-primary-600 bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/25'
        : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:bg-primary-50'
    }`}
  >
    <span className="mb-1.5 flex justify-center">{icon}</span>
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
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.97, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.97, opacity: 0, y: 8 }}
      className={`w-full ${widthClass} rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Live Action</p>
          <h3 className="mt-0.5 text-xl font-black text-neutral-900 dark:text-neutral-100">{title}</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="rounded-xl bg-neutral-100 p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 border border-neutral-200 dark:border-neutral-700 transition-colors flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

export default CashierActiveOrders;
