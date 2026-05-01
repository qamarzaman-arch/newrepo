import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsService, CurrentRates } from '../services/settingsService';
import { useSettingsStore } from './settingsStore';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: string;
  voidedAt?: string;
  voidReason?: string;
  voidedBy?: string;
}

export interface HeldOrder {
  id: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | 'WALK_IN' | 'RESERVATION';
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  guestCount?: number;
  items: OrderItem[];
  notes?: string;
  discountPercent: number;
  discountAmount: number;
  tipAmount: number;
  heldAt: string;
  heldBy?: string;
}

interface OrderState {
  currentOrder: {
    items: OrderItem[];
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | 'WALK_IN' | 'RESERVATION';
    tableId?: string;
    tableNumber?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    guestCount?: number;
    notes?: string;
    discountPercent: number;
    discountAmount: number;
    discountApprovedBy?: string;
    tipAmount: number;
    completedOrderId?: string;
    orderId?: string;
    isProcessing?: boolean;
    kitchenNotified?: boolean;
    tableLocked?: boolean;
    pricesUnvalidated?: boolean;
  };
  heldOrders: HeldOrder[];
  voidedItems: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    reason: string;
    voidedAt: string;
    voidedBy?: string;
  }>;
  backendRates: CurrentRates | null;
  addItem: (item: Omit<OrderItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  voidItem: (itemId: string, reason: string, voidedBy?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  setOrderNotes: (notes: string) => void;
  clearOrder: () => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | 'WALK_IN' | 'RESERVATION') => void;
  setTable: (tableId: string, tableNumber?: string) => void;
  setCustomer: (customer: { id?: string; name: string; phone?: string; address?: string }) => void;
  setGuestCount: (count: number) => void;
  applyDiscount: (percent: number, approvedBy?: string) => void;
  setTip: (amount: number) => void;
  setCompletedOrderId: (id: string) => void;
  setOrderId: (id: string) => void;
  setProcessing: (isProcessing: boolean) => void;
  setKitchenNotified: (notified: boolean) => void;
  lockTable: (locked: boolean) => void;
  holdOrder: (heldBy?: string) => void;
  resumeOrder: (heldOrderId: string) => void;
  removeHeldOrder: (heldOrderId: string) => void;
  cleanupExpiredHeldOrders: (maxAgeHours?: number) => void;
  fetchBackendRates: () => Promise<void>;
  getVoidedItems: () => Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    reason: string;
    voidedAt: string;
    voidedBy?: string;
  }>;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTax: () => number;
  getServiceCharge: () => number;
  getTip: () => number;
  getTotal: () => number;
}

const EMPTY_ORDER = {
  items: [] as OrderItem[],
  orderType: 'DINE_IN' as const,
  discountPercent: 0,
  discountAmount: 0,
  tipAmount: 0,
};

const getEffectiveRates = (backendRates: CurrentRates | null): CurrentRates => {
  if (backendRates) {
    return backendRates;
  }

  const settings = useSettingsStore.getState().settings;
  return {
    taxRate: settings.taxRate || 0,
    serviceChargeRate: settings.serviceCharge || 0,
    surcharges: [],
  };
};

export const useOrderStore = create<OrderState>()(
persist(
(set, get) => ({
  currentOrder: { ...EMPTY_ORDER },
  heldOrders: [],
  voidedItems: [],
  backendRates: null,

  fetchBackendRates: async () => {
    try {
      const rates = await settingsService.getCurrentRates();
      set({ backendRates: rates });
    } catch (error) {
      console.error('Failed to fetch backend rates:', error);
    }
  },

  addItem: (item) => {
    set((state) => {
      const existingItem = state.currentOrder.items.find(
        (i) => i.menuItemId === item.menuItemId && i.notes === item.notes
      );

      if (existingItem) {
        return {
          currentOrder: {
            ...state.currentOrder,
            items: state.currentOrder.items.map((i) =>
              i.id === existingItem.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          },
        };
      }

      return {
        currentOrder: {
          ...state.currentOrder,
          items: [
            ...state.currentOrder.items,
            { ...item, id: crypto.randomUUID() },
          ],
        },
      };
    });
  },

  removeItem: (itemId) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        items: state.currentOrder.items.filter((i) => i.id !== itemId),
      },
    }));
  },

  voidItem: (itemId, reason, voidedBy) => {
    // QA B47: voids must be attributable. Reject the call with a clear error
    // rather than silently storing an anonymous void.
    if (!voidedBy) {
      console.error('voidItem called without a voidedBy user — refusing.');
      throw new Error('voidedBy is required to void an item');
    }
    if (!reason || !reason.trim()) {
      throw new Error('reason is required to void an item');
    }
    set((state) => {
      const item = state.currentOrder.items.find((i) => i.id === itemId);
      if (!item) return state;

      const voidedItem = {
        itemId: item.id,
        itemName: item.name,
        quantity: item.quantity,
        price: item.price,
        reason: reason.trim(),
        voidedAt: new Date().toISOString(),
        voidedBy,
      };

      return {
        voidedItems: [...state.voidedItems, voidedItem],
        currentOrder: {
          ...state.currentOrder,
          items: state.currentOrder.items.filter((i) => i.id !== itemId),
        },
      };
    });
  },

  updateQuantity: (itemId, quantity) => {
    // QA B10: numeric keypads can produce NaN or negatives. Treat any
    // non-positive integer as a removal.
    const safe = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    if (safe < 1) {
      get().removeItem(itemId);
      return;
    }

    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        items: state.currentOrder.items.map((i) =>
          i.id === itemId ? { ...i, quantity: Math.min(safe, 9999) } : i
        ),
      },
    }));
  },

  updateNotes: (itemId, notes) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        items: state.currentOrder.items.map((i) =>
          i.id === itemId ? { ...i, notes } : i
        ),
      },
    }));
  },

  setOrderNotes: (notes) => {
    set((state) => ({ currentOrder: { ...state.currentOrder, notes } }));
  },

  clearOrder: () => {
    set({ currentOrder: { ...EMPTY_ORDER }, voidedItems: [] });
  },

  setOrderType: (type) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        orderType: type,
      },
    }));
  },

  setTable: (tableId, tableNumber) => {
    set((state) => ({
      currentOrder: { ...state.currentOrder, tableId, tableNumber },
    }));
  },

  setCustomer: (customer) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
      },
    }));
  },

  setGuestCount: (count) => {
    set((state) => ({ currentOrder: { ...state.currentOrder, guestCount: count } }));
  },

  setTip: (amount) => {
    set((state) => ({ currentOrder: { ...state.currentOrder, tipAmount: amount } }));
  },

  setCompletedOrderId: (id) => {
    set((state) => ({ currentOrder: { ...state.currentOrder, completedOrderId: id } }));
  },

  setOrderId: (id) => {
    set((state) => ({ currentOrder: { ...state.currentOrder, orderId: id } }));
  },

  applyDiscount: (percent, approvedBy) => {
    // QA B11: clamp discount so two stacked applies can't push the order
    // negative. Percent must be in [0, 100]; resulting amount can never
    // exceed the current subtotal.
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    set((state) => {
      const subtotal = state.currentOrder.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const rawDiscount = subtotal * (safePercent / 100);
      const discountAmount = Math.min(rawDiscount, subtotal);
      return {
        currentOrder: {
          ...state.currentOrder,
          discountPercent: safePercent,
          discountAmount,
          discountApprovedBy: approvedBy,
        },
      };
    });
  },

  setProcessing: (isProcessing) => {
    set((state) => ({
      currentOrder: { ...state.currentOrder, isProcessing },
    }));
  },

  setKitchenNotified: (notified) => {
    set((state) => ({
      currentOrder: { ...state.currentOrder, kitchenNotified: notified },
    }));
  },

  lockTable: (locked) => {
    set((state) => ({
      currentOrder: { ...state.currentOrder, tableLocked: locked },
    }));
  },

  holdOrder: (heldBy) => {
    const state = get();
    if (state.currentOrder.items.length === 0) return;

    const heldOrder: HeldOrder = {
      id: crypto.randomUUID(),
      orderType: state.currentOrder.orderType,
      tableId: state.currentOrder.tableId,
      tableNumber: state.currentOrder.tableNumber,
      customerName: state.currentOrder.customerName,
      customerPhone: state.currentOrder.customerPhone,
      customerAddress: state.currentOrder.customerAddress,
      guestCount: state.currentOrder.guestCount,
      items: state.currentOrder.items,
      notes: state.currentOrder.notes,
      discountPercent: state.currentOrder.discountPercent,
      discountAmount: state.currentOrder.discountAmount,
      tipAmount: state.currentOrder.tipAmount,
      heldAt: new Date().toISOString(),
      heldBy,
    };

    // QA B65: cap heldOrders at 50 so an inattentive shift doesn't grow the
    // persisted store unbounded. Drop the oldest first.
    const HELD_ORDER_CAP = 50;
    set((state) => {
      const next = [...state.heldOrders, heldOrder];
      const trimmed = next.length > HELD_ORDER_CAP
        ? next.slice(next.length - HELD_ORDER_CAP)
        : next;
      return {
        heldOrders: trimmed,
        currentOrder: { ...EMPTY_ORDER },
      };
    });
  },

  resumeOrder: (heldOrderId) => {
    set((state) => {
      const heldOrder = state.heldOrders.find((o) => o.id === heldOrderId);
      if (!heldOrder) return state;

      return {
        heldOrders: state.heldOrders.filter((o) => o.id !== heldOrderId),
        currentOrder: {
          ...EMPTY_ORDER,
          items: heldOrder.items,
          orderType: heldOrder.orderType,
          tableId: heldOrder.tableId,
          tableNumber: heldOrder.tableNumber,
          customerName: heldOrder.customerName,
          customerPhone: heldOrder.customerPhone,
          customerAddress: heldOrder.customerAddress,
          guestCount: heldOrder.guestCount,
          notes: heldOrder.notes,
          discountPercent: heldOrder.discountPercent,
          discountAmount: heldOrder.discountAmount,
          tipAmount: heldOrder.tipAmount,
          pricesUnvalidated: true,
        },
      };
    });
  },

  removeHeldOrder: (heldOrderId) => {
    set((state) => ({
      heldOrders: state.heldOrders.filter((o) => o.id !== heldOrderId),
    }));
  },

  cleanupExpiredHeldOrders: (maxAgeHours: number = 24) => {
    set((state) => {
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      const validOrders = state.heldOrders.filter((order) => {
        return now - new Date(order.heldAt).getTime() < maxAgeMs;
      });
      return { heldOrders: validOrders };
    });
  },

  getVoidedItems: () => get().voidedItems,

  getSubtotal: () => {
    return get().currentOrder.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  },

  getDiscount: () => get().currentOrder.discountAmount,

  getTax: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    const afterDiscount = subtotal - discount;
    const rates = getEffectiveRates(get().backendRates);
    // Use backend tax rate, fallback to 0 if not loaded
    const taxRate = rates?.taxRate ?? 0;
    return afterDiscount * (taxRate / 100);
  },

  getServiceCharge: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    const afterDiscount = subtotal - discount;
    const rates = getEffectiveRates(get().backendRates);
    // Use backend service charge rate, fallback to 0 if not loaded
    const serviceChargeRate = rates?.serviceChargeRate ?? 0;
    return afterDiscount * (serviceChargeRate / 100);
  },

  getTip: () => get().currentOrder.tipAmount || 0,

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    const afterDiscount = subtotal - discount;
    const rates = getEffectiveRates(get().backendRates);

    // Calculate tax from backend rate
    const taxRate = rates?.taxRate ?? 0;
    const tax = afterDiscount * (taxRate / 100);

    // Calculate service charge from backend rate
    const serviceChargeRate = rates?.serviceChargeRate ?? 0;
    const serviceCharge = afterDiscount * (serviceChargeRate / 100);

    // Add any additional surcharges from backend
    let surchargesTotal = 0;
    if (rates?.surcharges) {
      surchargesTotal = rates.surcharges.reduce((sum, surcharge) => {
        if (surcharge.type === 'PERCENTAGE') {
          return sum + (afterDiscount * (surcharge.value / 100));
        } else {
          return sum + surcharge.value;
        }
      }, 0);
    }

    const tip = get().getTip();
    return afterDiscount + tax + serviceCharge + surchargesTotal + tip;
  },
}),
  {
    name: 'pos-order-draft',
    // QA B18: held orders persisted to localStorage previously included
    // unmasked customer phones + prices. Mask the phone digits before write
    // so a casual host inspection (DevTools/disk) does not expose contact info.
    partialize: (state) => ({
      currentOrder: state.currentOrder,
      heldOrders: state.heldOrders.map((o) => ({
        ...o,
        customerPhone: o.customerPhone ? maskPhone(o.customerPhone) : o.customerPhone,
      })),
      voidedItems: state.voidedItems,
    }),
  }
));

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '*'.repeat(digits.length);
  return phone.slice(0, 2) + '*'.repeat(Math.max(0, digits.length - 4)) + phone.slice(-2);
}
