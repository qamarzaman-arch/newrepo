/**
 * Sync Conflict Resolver
 * Handles conflicts when the same record is modified offline and on the server
 */

export interface ConflictData {
  operationId: string;
  modelName: string;
  recordId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
  resolution?: 'local' | 'server' | 'merge';
}

class SyncConflictResolver {
  private conflicts: Map<string, ConflictData> = new Map();
  private readonly STORAGE_KEY = 'pos_sync_conflicts';

  constructor() {
    this.loadConflicts();
  }

  private loadConflicts() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const conflicts: ConflictData[] = JSON.parse(stored);
        conflicts.forEach(conflict => {
          this.conflicts.set(this.getConflictKey(conflict), conflict);
        });
      }
    } catch (error) {
      console.error('Failed to load sync conflicts:', error);
    }
  }

  private saveConflicts() {
    try {
      const conflicts = Array.from(this.conflicts.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conflicts));
    } catch (error) {
      console.error('Failed to save sync conflicts:', error);
    }
  }

  private getConflictKey(conflict: ConflictData): string {
    return `${conflict.modelName}:${conflict.recordId}`;
  }

  /**
   * Detect if there's a conflict between local and server data
   */
  detectConflict(
    operationId: string,
    modelName: string,
    recordId: string,
    localData: any,
    serverData: any,
    localTimestamp: number,
    serverTimestamp: number
  ): ConflictData | null {
    // Simple conflict detection: if server timestamp is newer than local
    // and data differs, we have a conflict
    if (serverTimestamp > localTimestamp) {
      const hasChanges = JSON.stringify(localData) !== JSON.stringify(serverData);
      
      if (hasChanges) {
        const conflict: ConflictData = {
          operationId,
          modelName,
          recordId,
          localData,
          serverData,
          localTimestamp,
          serverTimestamp,
        };
        
        this.conflicts.set(this.getConflictKey(conflict), conflict);
        this.saveConflicts();
        
        console.log(`[SyncConflictResolver] Conflict detected: ${modelName}:${recordId}`);
        return conflict;
      }
    }
    
    return null;
  }

  /**
   * Resolve a conflict by choosing which version to keep
   */
  resolveConflict(
    modelName: string,
    recordId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): boolean {
    const key = `${modelName}:${recordId}`;
    const conflict = this.conflicts.get(key);
    
    if (!conflict) {
      console.warn(`[SyncConflictResolver] No conflict found for ${key}`);
      return false;
    }

    conflict.resolution = resolution;
    
    if (resolution === 'local') {
      // Retry the operation with local data
      console.log(`[SyncConflictResolver] Resolving with local data for ${key}`);
    } else if (resolution === 'server') {
      // Discard local changes, accept server version
      console.log(`[SyncConflictResolver] Resolving with server data for ${key}`);
    } else if (resolution === 'merge' && mergedData) {
      // Use merged data
      console.log(`[SyncConflictResolver] Resolving with merged data for ${key}`);
    }

    // Remove from active conflicts
    this.conflicts.delete(key);
    this.saveConflicts();
    
    return true;
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolvedConflicts(): ConflictData[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolution);
  }

  /**
   * Get conflict count
   */
  getConflictCount(): number {
    return this.getUnresolvedConflicts().length;
  }

  /**
   * Clear all conflicts
   */
  clearAllConflicts(): void {
    this.conflicts.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Auto-resolve conflicts using last-write-wins strategy
   * Local wins if local timestamp is newer, Server wins otherwise
   */
  autoResolveConflicts(): { resolved: number; remaining: number } {
    let resolved = 0;
    
    this.conflicts.forEach((conflict) => {
      if (conflict.localTimestamp > conflict.serverTimestamp) {
        // Local is newer, keep local
        this.resolveConflict(conflict.modelName, conflict.recordId, 'local');
        resolved++;
      } else {
        // Server is newer, accept server
        this.resolveConflict(conflict.modelName, conflict.recordId, 'server');
        resolved++;
      }
    });

    return {
      resolved,
      remaining: this.getConflictCount(),
    };
  }
}

// Singleton instance
let syncConflictResolver: SyncConflictResolver | null = null;

export const getSyncConflictResolver = (): SyncConflictResolver => {
  if (!syncConflictResolver) {
    syncConflictResolver = new SyncConflictResolver();
  }
  return syncConflictResolver;
};

export default SyncConflictResolver;
