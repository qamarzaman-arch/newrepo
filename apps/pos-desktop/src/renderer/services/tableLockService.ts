/**
 * Table Lock Service
 * Uses backend DB-backed locks (Serializable transaction) to prevent race
 * conditions across cashier devices.
 */
import api from './api';

export interface TableLockInfo {
  locked: boolean;
  lockedBy?: string;
  userId?: string;
  expiresAt?: string;
  isMyLock?: boolean;
}

class TableLockService {
  private myLocks: Set<string> = new Set();

  async lockTable(tableId: string): Promise<{ success: boolean; lockedBy?: string }> {
    try {
      const res = await api.post('/table-locks/lock', { tableId });
      const data = res.data?.data;
      if (data?.success) {
        this.myLocks.add(tableId);
        return { success: true };
      }
      return { success: false, lockedBy: data?.lockedBy };
    } catch (err: any) {
      return { success: false, lockedBy: err?.response?.data?.error?.message };
    }
  }

  async unlockTable(tableId: string): Promise<boolean> {
    try {
      await api.post('/table-locks/unlock', { tableId });
      this.myLocks.delete(tableId);
      return true;
    } catch {
      return false;
    }
  }

  async getLockStatus(tableId: string): Promise<TableLockInfo> {
    try {
      const res = await api.get(`/table-locks/${tableId}`);
      return res.data?.data || { locked: false };
    } catch {
      return { locked: false };
    }
  }

  async extendLock(tableId: string): Promise<boolean> {
    try {
      await api.post('/table-locks/extend', { tableId });
      return true;
    } catch {
      return false;
    }
  }

  async getAllLocks(): Promise<Array<{ tableId: string; userId: string; expiresAt: string; user?: any; table?: any }>> {
    try {
      const res = await api.get('/table-locks');
      return res.data?.data?.locks || [];
    } catch {
      return [];
    }
  }

  async forceUnlock(tableId: string): Promise<boolean> {
    try {
      await api.post('/table-locks/force-unlock', { tableId });
      this.myLocks.delete(tableId);
      return true;
    } catch {
      return false;
    }
  }

  isMyLock(tableId: string): boolean {
    return this.myLocks.has(tableId);
  }
}

let instance: TableLockService | null = null;

export const getTableLockService = (): TableLockService => {
  if (!instance) instance = new TableLockService();
  return instance;
};

export default TableLockService;
