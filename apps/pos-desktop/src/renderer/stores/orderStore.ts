import { create } from 'zustand';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: string;
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
  };
  addItem: (item: Omit<OrderItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearOrder: () => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP') => void;
  setTable: (tableId: string) => void;
  setCustomer: (customer: { id: string; name: string; phone: string }) => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

const TAX_RATE = 0; // Can be configured from settings
const DISCOUNT_PERCENT = 0;

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: {
    items: [],
    orderType: 'DINE_IN',
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

  getSubtotal: () => {
    const state = get();
    return state.currentOrder.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = subtotal * (DISCOUNT_PERCENT / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (TAX_RATE / 100);
    return afterDiscount + tax;
  },
}));
