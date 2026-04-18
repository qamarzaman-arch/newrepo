/**
 * Enhanced Barcode Scanner Service
 * Handles scanner connection, errors, reconnection, and manual entry fallback
 */

import toast from 'react-hot-toast';

export interface BarcodeScanEvent {
  barcode: string;
  timestamp: number;
  source: 'scanner' | 'manual';
}

export interface ScannerStatus {
  connected: boolean;
  lastScan: number | null;
  errorCount: number;
  model?: string;
}

type ScanCallback = (barcode: string, source: 'scanner' | 'manual') => void;

class BarcodeScannerService {
  private callbacks: Set<ScanCallback> = new Set();
  private buffer: string = '';
  private bufferTimeout: NodeJS.Timeout | null = null;
  private readonly BUFFER_TIMEOUT = 100; // ms
  private readonly MIN_BARCODE_LENGTH = 4;
  private readonly MAX_BARCODE_LENGTH = 50;
  
  private status: ScannerStatus = {
    connected: false,
    lastScan: null,
    errorCount: 0,
  };

  private reconnectInterval: NodeJS.Timeout | null = null;
  private readonly RECONNECT_INTERVAL = 5000; // 5 seconds
  private readonly MAX_ERRORS = 3;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen for keyboard events (barcode scanners act as keyboards)
    document.addEventListener('keypress', this.handleKeyPress);
    
    // Check scanner health periodically
    this.startHealthCheck();
    
    console.log('Barcode scanner service initialized');
  }

  private handleKeyPress = (event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Enter key indicates end of barcode scan
    if (event.key === 'Enter') {
      this.processBuffer();
      return;
    }

    // Add character to buffer
    this.buffer += event.key;

    // Reset buffer timeout
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    // Auto-process buffer after timeout (in case Enter is not sent)
    this.bufferTimeout = setTimeout(() => {
      this.processBuffer();
    }, this.BUFFER_TIMEOUT);
  };

  private processBuffer() {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }

    const barcode = this.buffer.trim();
    this.buffer = '';

    // Validate barcode
    if (barcode.length < this.MIN_BARCODE_LENGTH) {
      return; // Too short, probably not a barcode
    }

    if (barcode.length > this.MAX_BARCODE_LENGTH) {
      this.handleError('Barcode too long');
      return;
    }

    // Valid barcode scanned
    this.handleScan(barcode, 'scanner');
  }

  private handleScan(barcode: string, source: 'scanner' | 'manual') {
    this.status.connected = true;
    this.status.lastScan = Date.now();
    this.status.errorCount = 0;

    // Notify all callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(barcode, source);
      } catch (error) {
        console.error('Error in barcode callback:', error);
      }
    });

    console.log(`Barcode scanned (${source}):`, barcode);
  }

  private handleError(error: string) {
    this.status.errorCount++;
    console.error('Barcode scanner error:', error);

    if (this.status.errorCount >= this.MAX_ERRORS) {
      this.status.connected = false;
      toast.error('Barcode scanner disconnected. Use manual entry or reconnect scanner.');
      this.startReconnection();
    }
  }

  private startHealthCheck() {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastScan = this.status.lastScan ? now - this.status.lastScan : Infinity;

      // If no scan in 5 minutes and errors occurred, mark as disconnected
      if (timeSinceLastScan > 5 * 60 * 1000 && this.status.errorCount > 0) {
        this.status.connected = false;
      }
    }, 30000); // Check every 30 seconds
  }

  private startReconnection() {
    if (this.reconnectInterval) return;

    this.reconnectInterval = setInterval(() => {
      // Try to reconnect by resetting error count
      if (this.status.errorCount > 0) {
        this.status.errorCount = Math.max(0, this.status.errorCount - 1);
      }

      // If errors cleared, mark as connected
      if (this.status.errorCount === 0) {
        this.status.connected = true;
        toast.success('Barcode scanner reconnected');
        this.stopReconnection();
      }
    }, this.RECONNECT_INTERVAL);
  }

  private stopReconnection() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Register a callback for barcode scans
   */
  public onScan(callback: ScanCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Manually enter a barcode (fallback when scanner not working)
   */
  public manualEntry(barcode: string): boolean {
    if (!barcode || barcode.trim().length === 0) {
      toast.error('Please enter a valid barcode');
      return false;
    }

    const trimmed = barcode.trim();

    if (trimmed.length < this.MIN_BARCODE_LENGTH) {
      toast.error(`Barcode too short (minimum ${this.MIN_BARCODE_LENGTH} characters)`);
      return false;
    }

    if (trimmed.length > this.MAX_BARCODE_LENGTH) {
      toast.error(`Barcode too long (maximum ${this.MAX_BARCODE_LENGTH} characters)`);
      return false;
    }

    this.handleScan(trimmed, 'manual');
    return true;
  }

  /**
   * Get scanner status
   */
  public getStatus(): ScannerStatus {
    return { ...this.status };
  }

  /**
   * Test scanner connection
   */
  public async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        toast.error('Scanner test timeout. Please scan a barcode or use manual entry.');
        resolve(false);
      }, 5000);

      const unsubscribe = this.onScan(() => {
        clearTimeout(timeout);
        unsubscribe();
        toast.success('Scanner connected and working!');
        resolve(true);
      });

      toast.info('Please scan any barcode to test scanner...');
    });
  }

  /**
   * Reset scanner state
   */
  public reset() {
    this.buffer = '';
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    this.status.errorCount = 0;
    this.status.connected = true;
    this.stopReconnection();
  }

  /**
   * Cleanup and destroy service
   */
  public destroy() {
    document.removeEventListener('keypress', this.handleKeyPress);
    
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }
    
    this.stopReconnection();
    this.callbacks.clear();
    
    console.log('Barcode scanner service destroyed');
  }
}

// Singleton instance
let barcodeScannerService: BarcodeScannerService | null = null;

export const getBarcodeScannerService = (): BarcodeScannerService => {
  if (!barcodeScannerService) {
    barcodeScannerService = new BarcodeScannerService();
  }
  return barcodeScannerService;
};

export default BarcodeScannerService;
