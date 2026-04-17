import { create } from 'zustand';
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
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    discountPercent: number;
    discountAmount: number;
  };
  heldOrders: HeldOrder[];
  addItem: (item: Omit<OrderItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearOrder: () => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP') => void;
  setTable: (tableId: string) => void;
  setCustomer: (customer: { id: string; name: string; phone: string }) => void;
  applyDiscount: (percent: number) => void;
  holdOrder: () => void;
  resumeOrder: (heldOrderId: string) => void;
  removeHeldOrder: (heldOrderId: string) => void;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: {
    items: [],
    orderType: 'DINE_IN',
    discountPercent: 0,
    discountAmount: 0,
  },
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

  clearOrder: () => {
    set({
      currentOrder: {
        items: [],
        orderType: 'DINE_IN',
        discountPercent: 0,
        discountAmount: 0,
      },
    });
  },

  setOrderType: (type) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        orderType: type,
      },
    }));
  },

  setTable: (tableId) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        tableId,
      },
    }));
  },

  setCustomer: (customer) => {
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
      },
    }));
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
      currentOrder: {
        items: [],
        orderType: 'DINE_IN',
        discountPercent: 0,
        discountAmount: 0,
      },
    }));
  },

  resumeOrder: (heldOrderId) => {
    set((state) => {
      const heldOrder = state.heldOrders.find((o) => o.id === heldOrderId);
      if (!heldOrder) return state;

      return {
        heldOrders: state.heldOrders.filter((o) => o.id !== heldOrderId),
        currentOrder: {
          items: heldOrder.items,
          orderType: heldOrder.orderType,
          tableId: heldOrder.tableId,
          customerName: heldOrder.customerName,
          notes: heldOrder.notes,
          discountPercent: 0,
          discountAmount: 0,
        },
      };
    });
  },

  removeHeldOrder: (heldOrderId) => {
    set((state) => ({
      heldOrders: state.heldOrders.filter((o) => o.id !== heldOrderId),
    }));
  },

  getSubtotal: () => {
    const state = get();
    return state.currentOrder.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  },

  getDiscount: () => {
    const state = get();
    return state.currentOrder.discountAmount;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscount();
    const afterDiscount = subtotal - discount;
    
    // Get tax rate from settings
    const settings = useSettingsStore.getState();
    const taxRate = settings.settings.taxRate || 0;
    const tax = afterDiscount * (taxRate / 100);
    
    return afterDiscount + tax;
  },
}));
