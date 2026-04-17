import { useOrderStore } from '../orderStore';
import { useSettingsStore } from '../settingsStore';

describe('Order Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { clearOrder } = useOrderStore.getState();
    clearOrder();
    useSettingsStore.getState().resetSettings();
  });

  it('should add item to order', () => {
    const { addItem } = useOrderStore.getState();
    
    addItem({
      menuItemId: 'test-1',
      name: 'Test Item',
      price: 10.99,
      quantity: 2,
    });

    const { currentOrder } = useOrderStore.getState();
    expect(currentOrder.items).toHaveLength(1);
    expect(currentOrder.items[0].name).toBe('Test Item');
    expect(currentOrder.items[0].quantity).toBe(2);
  });

  it('should remove item from order', () => {
    const { addItem, removeItem } = useOrderStore.getState();
    
    addItem({
      menuItemId: 'test-1',
      name: 'Test Item',
      price: 10.99,
      quantity: 1,
    });

    let { currentOrder } = useOrderStore.getState();
    expect(currentOrder.items).toHaveLength(1);
    const itemId = currentOrder.items[0].id;

    removeItem(itemId);
    ({ currentOrder } = useOrderStore.getState());
    expect(currentOrder.items).toHaveLength(0);
  });

  it('should update item quantity', () => {
    const { addItem, updateQuantity } = useOrderStore.getState();
    
    addItem({
      menuItemId: 'test-1',
      name: 'Test Item',
      price: 10.99,
      quantity: 1,
    });

    const { currentOrder: orderAfterAdd } = useOrderStore.getState();
    const itemId = orderAfterAdd.items[0].id;
    updateQuantity(itemId, 5);
    
    const { currentOrder } = useOrderStore.getState();
    expect(currentOrder.items[0].quantity).toBe(5);
  });

  it('should calculate subtotal correctly', () => {
    const { addItem, getSubtotal } = useOrderStore.getState();
    
    addItem({
      menuItemId: 'test-1',
      name: 'Item 1',
      price: 10.00,
      quantity: 2,
    });

    addItem({
      menuItemId: 'test-2',
      name: 'Item 2',
      price: 5.00,
      quantity: 1,
    });

    expect(getSubtotal()).toBe(25.00);
  });

  it('should calculate total with tax', () => {
    const { addItem, getTotal } = useOrderStore.getState();
    useSettingsStore.getState().updateSettings({ taxRate: 8.5 });

    addItem({
      menuItemId: 'test-1',
      name: 'Test Item',
      price: 100.00,
      quantity: 1,
    });

    const total = getTotal();
    expect(total).toBe(108.5);
  });

  it('should update item notes', () => {
    const { addItem, updateNotes } = useOrderStore.getState();
    
    addItem({
      menuItemId: 'test-1',
      name: 'Test Item',
      price: 10.99,
      quantity: 1,
    });

    const { currentOrder: orderAfterAdd } = useOrderStore.getState();
    const itemId = orderAfterAdd.items[0].id;
    updateNotes(itemId, 'No onions please');
    
    const { currentOrder } = useOrderStore.getState();
    expect(currentOrder.items[0].notes).toBe('No onions please');
  });

  it('should reset order', () => {
    const { addItem, clearOrder } = useOrderStore.getState();
    
    addItem({
      menuItemId: 'test-1',
      name: 'Test Item',
      price: 10.99,
      quantity: 1,
    });

    let { currentOrder } = useOrderStore.getState();
    expect(currentOrder.items).toHaveLength(1);

    clearOrder();
    ({ currentOrder } = useOrderStore.getState());
    expect(currentOrder.items).toHaveLength(0);
  });
});
