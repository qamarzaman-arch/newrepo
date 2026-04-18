/**
 * Table Lock Service
 * Prevents race conditions when multiple cashiers try to select the same table
 */

interface TableLock {
  tableId: string;
  lockedBy: string;
  lockedAt: number;
  expiresAt: number;
}

class TableLockService {
  private locks: Map<string, TableLock> = new Map();
  private readonly LOCK_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'pos_table_locks';
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadLocks();
    this.startCleanup();
  }

  private loadLocks() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const locks: TableLock[] = JSON.parse(stored);
        locks.forEach(lock => {
          if (lock.expiresAt > Date.now()) {
            this.locks.set(lock.tableId, lock);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load table locks:', error);
    }
  }

  private saveLocks() {
    try {
      const locks = Array.from(this.locks.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(locks));
    } catch (error) {
      console.error('Failed to save table locks:', error);
    }
  }

  private startCleanup() {
    // Clean up expired locks every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 30000);
  }

  private cleanupExpiredLocks() {
    const now = Date.now();
    let cleaned = false;

    this.locks.forEach((lock, tableId) => {
      if (lock.expiresAt < now) {
        this.locks.delete(tableId);
        cleaned = true;
      }
    });

    if (cleaned) {
      this.saveLocks();
    }
  }

  /**
   * Attempt to lock a table
   * @returns true if lock acquired, false if table is already locked
   */
  public lockTable(tableId: string, userId: string): boolean {
    const now = Date.now();
    const existingLock = this.locks.get(tableId);

    // Check if table is already locked by someone else
    if (existingLock) {
      // If lock expired, allow new lock
      if (existingLock.expiresAt < now) {
        this.locks.delete(tableId);
      } else if (existingLock.lockedBy !== userId) {
        // Table is locked by someone else
        return false;
      }
    }

    // Create new lock
    const lock: TableLock = {
      tableId,
      lockedBy: userId,
      lockedAt: now,
      expiresAt: now + this.LOCK_DURATION,
    };

    this.locks.set(tableId, lock);
    this.saveLocks();
    return true;
  }

  /**
   * Release a table lock
   */
  public unlockTable(tableId: string, userId: string): boolean {
    const lock = this.locks.get(tableId);
    
    if (!lock) {
      return true; // Already unlocked
    }

    // Only allow unlock if locked by same user
    if (lock.lockedBy === userId) {
      this.locks.delete(tableId);
      this.saveLocks();
      return true;
    }

    return false;
  }

  /**
   * Check if a table is locked
   */
  public isTableLocked(tableId: string, userId?: string): boolean {
    const lock = this.locks.get(tableId);
    
    if (!lock) {
      return false;
    }

    // Check if lock expired
    if (lock.expiresAt < Date.now()) {
      this.locks.delete(tableId);
      this.saveLocks();
      return false;
    }

    // If userId provided, check if locked by same user
    if (userId && lock.lockedBy === userId) {
      return false; // Not locked for this user
    }

    return true;
  }

  /**
   * Get lock info for a table
   */
  public getLockInfo(tableId: string): TableLock | null {
    const lock = this.locks.get(tableId);
    
    if (!lock) {
      return null;
    }

    // Check if expired
    if (lock.expiresAt < Date.now()) {
      this.locks.delete(tableId);
      this.saveLocks();
      return null;
    }

    return { ...lock };
  }

  /**
   * Extend lock duration
   */
  public extendLock(tableId: string, userId: string): boolean {
    const lock = this.locks.get(tableId);
    
    if (!lock || lock.lockedBy !== userId) {
      return false;
    }

    lock.expiresAt = Date.now() + this.LOCK_DURATION;
    this.saveLocks();
    return true;
  }

  /**
   * Force unlock (admin only)
   */
  public forceUnlock(tableId: string): void {
    this.locks.delete(tableId);
    this.saveLocks();
  }

  /**
   * Get all locked tables
   */
  public getLockedTables(): TableLock[] {
    this.cleanupExpiredLocks();
    return Array.from(this.locks.values());
  }

  /**
   * Clear all locks (use with caution)
   */
  public clearAllLocks(): void {
    this.locks.clear();
    this.saveLocks();
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
let tableLockService: TableLockService | null = null;

export const getTableLockService = (): TableLockService => {
  if (!tableLockService) {
    tableLockService = new TableLockService();
  }
  return tableLockService;
};

export default TableLockService;
