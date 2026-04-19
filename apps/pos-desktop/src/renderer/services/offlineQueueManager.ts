import { orderService } from './orderService';
import toast from 'react-hot-toast';

interface QueuedOrder {
  id: string;
  orderData: any;
  paymentData?: {
    method: 'CASH' | 'CARD' | 'SPLIT';
    amount: number;
    cashReceived?: number;
    splitPayments?: Array<{ method: string; amount: number }>;
    notes?: string;
  };
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;
  syncedOrderId?: string;
}

class OfflineQueueManager {
  private queue: QueuedOrder[] = [];
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private readonly STORAGE_KEY = 'pos_offline_queue';
  private readonly MAX_RETRIES = 3;
  private syncInterval: NodeJS.Timeout | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
    this.startAutoSync();
  }

  private setupEventListeners() {
    // Store handler references so they can be properly removed
    this.onlineHandler = () => {
      this.isOnline = true;
      console.log('Connection restored. Starting sync...');
      toast.success('Connection restored. Syncing orders...');
      this.syncQueue();
    };

    this.offlineHandler = () => {
      this.isOnline = false;
      console.log('Connection lost. Orders will be queued.');
      toast.error('Connection lost. Orders will be saved and synced when online.');
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  private startAutoSync() {
    // Try to sync every 30 seconds if online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
        this.syncQueue();
      }
    }, 30000);
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`Loaded ${this.queue.length} queued orders from storage`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  public addToQueue(orderData: any, paymentData?: QueuedOrder['paymentData']): string {
    const queuedOrder: QueuedOrder = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderData,
      paymentData,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(queuedOrder);
    this.saveQueue();

    console.log(`Order ${queuedOrder.id} added to offline queue with payment info`);
    toast.success(`Order queued offline. Will sync when connection is restored.`);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueue();
    }

    return queuedOrder.id;
  }

  public async syncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`Starting sync of ${this.queue.length} queued orders...`);

    const pendingOrders = this.queue.filter(
      (order) => order.status === 'pending' || order.status === 'failed'
    );

    let successCount = 0;
    let failCount = 0;

    for (const queuedOrder of pendingOrders) {
      if (queuedOrder.retryCount >= this.MAX_RETRIES) {
        console.error(`Order ${queuedOrder.id} exceeded max retries. Marking as failed.`);
        queuedOrder.status = 'failed';
        queuedOrder.error = 'Max retries exceeded';
        failCount++;
        continue;
      }

      try {
        queuedOrder.status = 'syncing';
        this.saveQueue();

        // Step 1: Create the order
        const orderResponse = await orderService.createOrder(queuedOrder.orderData);
        
        if (!orderResponse.data.success) {
          throw new Error('Order creation failed');
        }

        const orderId = orderResponse.data.data.order.id;
        queuedOrder.syncedOrderId = orderId;

        // Step 2: Process payment if payment data exists
        if (queuedOrder.paymentData) {
          if (queuedOrder.paymentData.method === 'SPLIT' && queuedOrder.paymentData.splitPayments) {
            // Process split payments
            for (const payment of queuedOrder.paymentData.splitPayments) {
              await orderService.processPayment(orderId, {
                method: payment.method as any,
                amount: payment.amount,
                notes: queuedOrder.paymentData.notes,
              });
            }
          } else {
            // Process single payment
            await orderService.processPayment(orderId, {
              method: queuedOrder.paymentData.method,
              amount: queuedOrder.paymentData.amount,
              notes: queuedOrder.paymentData.notes,
            });
          }
        }

        // Mark as success and remove from queue
        queuedOrder.status = 'success';
        this.queue = this.queue.filter((o) => o.id !== queuedOrder.id);
        successCount++;
        console.log(`Order ${queuedOrder.id} synced successfully as order ${orderId}`);
      } catch (error: any) {
        console.error(`Failed to sync order ${queuedOrder.id}:`, error);
        queuedOrder.status = 'failed';
        queuedOrder.retryCount++;
        queuedOrder.error = error.message || 'Unknown error';
        failCount++;
      }
    }

    this.saveQueue();
    this.isSyncing = false;

    // Show results
    if (successCount > 0) {
      toast.success(`${successCount} order${successCount !== 1 ? 's' : ''} synced successfully!`);
    }

    if (failCount > 0) {
      toast.error(`${failCount} order${failCount !== 1 ? 's' : ''} failed to sync. Will retry later.`);
    }

    console.log(`Sync complete. Success: ${successCount}, Failed: ${failCount}, Remaining: ${this.queue.length}`);
  }

  public getQueueStatus() {
    return {
      total: this.queue.length,
      pending: this.queue.filter((o) => o.status === 'pending').length,
      syncing: this.queue.filter((o) => o.status === 'syncing').length,
      failed: this.queue.filter((o) => o.status === 'failed').length,
      success: this.queue.filter((o) => o.status === 'success').length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      oldestPending: this.queue.length > 0 ? Math.min(...this.queue.map(o => o.timestamp)) : null,
    };
  }

  public getQueue(): QueuedOrder[] {
    return [...this.queue];
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('Offline queue cleared');
  }

  public removeFromQueue(orderId: string) {
    this.queue = this.queue.filter((o) => o.id !== orderId);
    this.saveQueue();
    console.log(`Order ${orderId} removed from queue`);
  }

  public retryOrder(orderId: string) {
    const order = this.queue.find((o) => o.id === orderId);
    if (order) {
      order.status = 'pending';
      order.retryCount = 0;
      order.error = undefined;
      this.saveQueue();
      
      if (this.isOnline) {
        this.syncQueue();
      }
    }
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    // Properly remove the stored event handlers
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
    }
    this.onlineHandler = null;
    this.offlineHandler = null;
  }
}

// Singleton instance
let offlineQueueManager: OfflineQueueManager | null = null;

export const getOfflineQueueManager = (): OfflineQueueManager => {
  if (!offlineQueueManager) {
    offlineQueueManager = new OfflineQueueManager();
  }
  return offlineQueueManager;
};

export default OfflineQueueManager;
