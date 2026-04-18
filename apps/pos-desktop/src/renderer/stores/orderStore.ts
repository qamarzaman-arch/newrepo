import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from './settingsStore';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: string;
}

export interface HeldOrder {
  id: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP';
  tableId?: string;
  customerName?: string;
  items: OrderItem[];
  notes?: string;
  heldAt: string;
}

interface OrderState {
  currentOrder: {
    items: OrderItem[];
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP';
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
    tipAmount: number;
    completedOrderId?: string;
  };
  heldOrders: HeldOrder[];
  addItem: (item: Omit<OrderItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  setOrderNotes: (notes: string) => void;
  clearOrder: () => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP') => void;
  setTable: (tableId: string, tableNumber?: string) => void;
  setCustomer: (customer: { id?: string; name: string; phone?: string; address?: string }) => void;
  setGuestCount: (count: number) => void;
  applyDiscount: (percent: number) => void;
  setTip: (amount: number) => void;
  setCompletedOrderId: (id: string) => void;
  holdOrder: () => void;
  resumeOrder: (heldOrderId: string) => void;
  removeHeldOrder: (heldOrderId: string) => void;
  cleanupExpiredHeldOrders: (maxAgeHours?: number) => void;
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

export const useOrderStore = create<OrderState>()(
 persist(
(set, get) => ({
  currentOrder: { ...EMPTY_ORDER },
  heldOrders: [],

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

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }

    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        items: state.currentOrder.items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
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
    set({ currentOrder: { ...EMPTY_ORDER } });
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

  applyDiscount: (percent) => {
    set((state) => {
      const subtotal = state.currentOrder.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const discountAmount = subtotal * (percent / 100);
      return {
        currentOrder: {
          ...state.currentOrder,
          discountPercent: percent,
          discountAmount,
        },
      };
    });
  },

  holdOrder: () => {
    const state = get();
    if (state.currentOrder.items.length === 0) return;

    const heldOrder: HeldOrder = {
      id: crypto.randomUUID(),
      orderType: state.currentOrder.orderType,
      tableId: state.currentOrder.tableId,
      customerName: state.currentOrder.customerName,
      items: state.currentOrder.items,
      notes: state.currentOrder.notes,
      heldAt: new Date().toISOString(),
    };

    set((state) => ({
      heldOrders: [...state.heldOrders, heldOrder],
      currentOrder: { ...EMPTY_ORDER },
    }));
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
          customerName: heldOrder.customerName,
          notes: heldOrder.notes,
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
      const now = new Date();
      const validOrders = state.heldOrders.filter((order) => {
        const heldDate = new Date(order.heldAt);
        const ageInHours = (now.getTime() - heldDate.getTime()) / (1000 * 60 * 60);
        return ageInHours < maxAgeHours;
      });
      return { heldOrders: validOrders };
    });
  },

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
    const { settings } = useSettingsStore.getState();
    return afterDiscount * ((settings.taxRate || 0) / 100);
  },

  getServiceCharge: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    const afterDiscount = subtotal - discount;
    const { settings } = useSettingsStore.getState();
    return afterDiscount * ((settings.serviceCharge || 0) / 100);
  },

  getTip: () => get().currentOrder.tipAmount || 0,

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    const afterDiscount = subtotal - discount;
    const { settings } = useSettingsStore.getState();
    const tax = afterDiscount * ((settings.taxRate || 0) / 100);
    const serviceCharge = afterDiscount * ((settings.serviceCharge || 0) / 100);
    const tip = get().getTip();
    return afterDiscount + tax + serviceCharge + tip;
  },
}),
  {
    name: 'pos-order-draft',
    partialize: (state) => ({
      currentOrder: state.currentOrder,
      heldOrders: state.heldOrders,
    }),
  }
));
