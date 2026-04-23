import { orderService } from './orderService';
import toast from 'react-hot-toast';

interface QueuedOrder {
  id: string;
  orderData: any;
  paymentData?: {
    method: 'CASH' | 'CARD' | 'SPLIT';
    amount: number;
    cashReceived?: number;
    splitPayments?: Array<{ method: 'CASH' | 'CARD'; amount: number }>;
    notes?: string;
  };
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;
  syncedOrderId?: string;
  idempotencyKey: string; // Unique key to prevent duplicate orders
  syncCheckpoint?: 'order_created' | 'payment_processing' | 'completed';
  nonRetryableError?: boolean; // Flag for permanent failures
}

class OfflineQueueManager {
  private queue: QueuedOrder[] = [];
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncLock: boolean = false; // Prevents concurrent sync calls
  private readonly STORAGE_KEY = 'pos_offline_queue';
  private readonly MAX_RETRIES = 3;
  private readonly MAX_QUEUE_SIZE = 100; // Prevent unbounded growth
  private syncInterval: NodeJS.Timeout | null = null;
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;
  private saveTimeout: NodeJS.Timeout | null = null; // For debounced saves

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

  private saveQueueImmediate() {
    try {
      // Check queue size to prevent storage quota issues
      const serialized = JSON.stringify(this.queue);
      if (serialized.length > 4 * 1024 * 1024) { // 4MB safety limit
        console.error('Queue too large, removing oldest completed orders');
        // Remove completed orders older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.queue = this.queue.filter(o => 
          !(o.status === 'success' && o.timestamp < oneHourAgo)
        );
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
      // Queue too large - alert user
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        toast.error('Order queue full. Please sync before taking more orders.');
      }
    }
  }

  // Debounced save to batch rapid changes
  private saveQueue() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveQueueImmediate();
    }, 300);
  }

  public addToQueue(orderData: any, paymentData?: QueuedOrder['paymentData']): string {
    // Check queue size limit
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      const pendingCount = this.queue.filter(o => o.status === 'pending').length;
      if (pendingCount >= this.MAX_QUEUE_SIZE) {
        throw new Error('Order queue full. Please sync before taking more orders.');
      }
      // Remove old completed orders to make room
      this.queue = this.queue.filter(o => o.status !== 'success');
    }

    const timestamp = Date.now();
    const idempotencyKey = `offline_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const queuedOrder: QueuedOrder = {
      id: `offline_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
      orderData: {
        ...orderData,
        idempotencyKey,
      },
      paymentData,
      timestamp,
      retryCount: 0,
      status: 'pending',
      idempotencyKey,
      syncCheckpoint: undefined,
      nonRetryableError: false,
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

  private isRetryableError(error: any): boolean {
    // Non-retryable errors (4xx client errors except 429 rate limit)
    if (error.response?.status) {
      const status = error.response.status;
      // Don't retry on bad requests, unauthorized, forbidden, not found, conflict
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }
    // Retry on network errors, timeouts, and 5xx server errors
    return true;
  }

  private async processOrderWithRecovery(queuedOrder: QueuedOrder): Promise<void> {
    queuedOrder.status = 'syncing';
    this.saveQueue();

    try {
      // Check if already synced (idempotency check)
      if (queuedOrder.syncedOrderId) {
        console.log(`Order ${queuedOrder.id} already has syncedOrderId ${queuedOrder.syncedOrderId}, checking status...`);
        
        // Verify order exists on server and get its actual status
        try {
          const syncedId = queuedOrder.syncedOrderId!;
          const checkResponse = await orderService.getOrder(syncedId);
          
          if (checkResponse.data.data?.order) {
            const serverOrder = checkResponse.data.data.order;
            
            // Check if order is fully paid
            if (serverOrder.paymentStatus === 'PAID' || serverOrder.paidAmount >= serverOrder.totalAmount) {
              console.log(`Order ${syncedId} is already fully paid on server`);
              queuedOrder.syncCheckpoint = 'completed';
              queuedOrder.status = 'success';
              this.saveQueue();
              return;
            }
            
            // If order exists but not paid, resume payment from checkpoint
            console.log(`Order ${syncedId} exists but not fully paid, resuming from checkpoint`);
          }
        } catch (e) {
          // Order doesn't exist, reset and retry
          console.log(`Order ${queuedOrder.syncedOrderId} not found on server, will recreate`);
          queuedOrder.syncedOrderId = undefined;
          queuedOrder.syncCheckpoint = undefined;
        }
      }

      // Step 1: Create order (if not already created)
      if (!queuedOrder.syncedOrderId) {
        console.log(`Creating order for ${queuedOrder.id}...`);
        const orderResponse = await orderService.createOrder(queuedOrder.orderData);
        
        if (orderResponse.queued) {
          // Order was queued for later sync (offline)
          console.log(`Order queued for offline sync, will be processed later`);
          queuedOrder.syncCheckpoint = 'order_created';
          queuedOrder.status = 'pending';
          queuedOrder.syncedOrderId = orderResponse.queueId;
          this.saveQueue();
          return;
        }
        
        if (!orderResponse.success || !orderResponse.data?.order) {
          throw new Error(orderResponse.error?.message || 'Order creation failed');
        }

        const orderId = orderResponse.data.order.id;
        queuedOrder.syncedOrderId = orderId;
        queuedOrder.syncCheckpoint = 'order_created';
        this.saveQueue();
        console.log(`Order ${queuedOrder.id} created as ${orderId}`);
      }

      const orderId = queuedOrder.syncedOrderId;

      // Step 2: Process payment (if exists and not already completed)
      if (queuedOrder.paymentData && queuedOrder.syncCheckpoint !== 'completed') {
        queuedOrder.syncCheckpoint = 'payment_processing';
        this.saveQueue();

        console.log(`Processing payment for order ${orderId}...`);

        let paymentSuccess = false;
        
        if (queuedOrder.paymentData.method === 'SPLIT' && queuedOrder.paymentData.splitPayments) {
          // Process split payments
          for (const payment of queuedOrder.paymentData.splitPayments) {
            const method = payment.method;
            if (!method) continue;
            
            try {
              await orderService.processPayment(orderId, {
                method,
                amount: payment.amount,
                notes: queuedOrder.paymentData.notes,
              });
            } catch (paymentError) {
              // Check if payment was already processed (idempotent)
              if (paymentError?.response?.status === 409) {
                console.log(`Payment already processed for order ${orderId}, continuing...`);
                continue;
              }
              throw paymentError;
            }
          }
          paymentSuccess = true;
        } else {
          // Process single payment
          const method = queuedOrder.paymentData.method;
          if (method) {
            try {
              await orderService.processPayment(orderId, {
                method,
                amount: queuedOrder.paymentData.amount,
                cashReceived: queuedOrder.paymentData.cashReceived,
                notes: queuedOrder.paymentData.notes,
              });
              paymentSuccess = true;
            } catch (paymentError) {
              // Check if payment was already processed (idempotent)
              if (paymentError?.response?.status === 409) {
                console.log(`Payment already processed for order ${orderId}`);
                paymentSuccess = true;
              } else {
                throw paymentError;
              }
            }
          }
        }
        
        if (paymentSuccess) {
          console.log(`Payment processed for order ${orderId}`);
        }
      }

      // Step 3: Verify final state on server
      try {
        const finalCheck = await orderService.getOrder(orderId);
        const finalOrder = finalCheck.data.data?.order;
        
        if (finalOrder && (finalOrder.paymentStatus === 'PAID' || finalOrder.paidAmount >= finalOrder.totalAmount)) {
          console.log(`Order ${orderId} verified as paid on server`);
        } else {
          console.warn(`Order ${orderId} may not be fully paid, paymentStatus: ${finalOrder?.paymentStatus}`);
        }
      } catch (verifyError) {
        console.error(`Failed to verify order ${orderId} on server:`, verifyError);
        // Don't fail the sync if verification fails
      }

      // Mark as completed
      queuedOrder.syncCheckpoint = 'completed';
      queuedOrder.status = 'success';
      
      // Keep completed orders for 24 hours for reference, then remove
      setTimeout(() => {
        this.queue = this.queue.filter((o) => o.id !== queuedOrder.id);
        this.saveQueue();
      }, 24 * 60 * 60 * 1000);
      
      console.log(`Order ${queuedOrder.id} synced successfully as order ${orderId}`);
    } catch (error: any) {
      console.error(`Failed to sync order ${queuedOrder.id}:`, error);
      
      // Determine if error is retryable
      const retryable = this.isRetryableError(error);
      queuedOrder.nonRetryableError = !retryable;
      
      if (!retryable || queuedOrder.retryCount >= this.MAX_RETRIES) {
        queuedOrder.status = 'failed';
        if (!retryable) {
          queuedOrder.error = `Permanent error: ${error.message || 'Unknown error'}`;
        } else {
          queuedOrder.error = `Max retries exceeded: ${error.message || 'Unknown error'}`;
        }
      } else {
        queuedOrder.status = 'failed';
        queuedOrder.retryCount++;
        queuedOrder.error = `Attempt ${queuedOrder.retryCount}/${this.MAX_RETRIES}: ${error.message || 'Unknown error'}`;
      }
      
      throw error;
    }
  }

  public async syncQueue(): Promise<void> {
    // Check for concurrent sync attempts
    if (this.syncLock || this.isSyncing || !this.isOnline || this.queue.length === 0) {
      console.log('Sync already in progress or conditions not met');
      return;
    }

    // Acquire lock to prevent concurrent syncs
    this.syncLock = true;
    this.isSyncing = true;

    try {
    console.log(`Starting sync of ${this.queue.length} queued orders...`);

    // Filter orders that need processing (exclude completed and permanent failures)
    const pendingOrders = this.queue.filter(
      (order) => 
        (order.status === 'pending' || order.status === 'failed') &&
        !order.nonRetryableError
    );

    let successCount = 0;
    let failCount = 0;
    let permanentFailCount = 0;

    for (const queuedOrder of pendingOrders) {
      // Skip if already being processed or succeeded
      if (queuedOrder.status === 'syncing' || queuedOrder.status === 'success') {
        continue;
      }

      // Skip permanent failures
      if (queuedOrder.nonRetryableError) {
        permanentFailCount++;
        continue;
      }

      try {
        await this.processOrderWithRecovery(queuedOrder);
        successCount++;
      } catch (error: any) {
        if (queuedOrder.nonRetryableError) {
          permanentFailCount++;
          toast.error(`Order sync failed permanently: ${queuedOrder.error}`);
        } else {
          failCount++;
        }
      }
      
      // Save after each order to checkpoint progress
      this.saveQueue();
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

    if (permanentFailCount > 0) {
      toast.error(`${permanentFailCount} order${permanentFailCount !== 1 ? 's' : ''} failed permanently. Please review in settings.`);
    }

    console.log(`Sync complete. Success: ${successCount}, Failed (retryable): ${failCount}, Failed (permanent): ${permanentFailCount}, Remaining: ${this.queue.length}`);
    } finally {
      // Always release locks
      this.isSyncing = false;
      this.syncLock = false;
    }
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
