/**
 * Hardware Integration Manager for POSLytic
 * Manages thermal printers, barcode scanners, cash drawers, and customer displays
 */

export interface PrinterConfig {
  enabled: boolean;
  type: 'thermal' | 'inkjet' | 'laser';
  connectionType: 'usb' | 'bluetooth' | 'network' | 'serial';
  devicePath?: string;
  ipAddress?: string;
  port?: number;
  paperWidth: 58 | 80; // mm
  autoCut: boolean;
  printDensity: number; // 0-100
}

export interface CashDrawerConfig {
  enabled: boolean;
  connectionType: 'printer' | 'usb' | 'serial';
  printerDevicePath?: string; // If connected via printer
  kickPin: 2 | 5; // Pin 2 or 5
  pulseDuration: number; // milliseconds
}

export interface BarcodeScannerConfig {
  enabled: boolean;
  connectionType: 'usb-hid' | 'usb-serial' | 'bluetooth';
  devicePath?: string;
  prefix?: string;
  suffix?: string;
  autoSubmit: boolean;
}

export interface CustomerDisplayConfig {
  enabled: boolean;
  connectionType: 'usb' | 'serial' | 'network';
  devicePath?: string;
  ipAddress?: string;
  port?: number;
  brightness: number; // 0-100
}

export interface HardwareState {
  printer: PrinterConfig;
  cashDrawer: CashDrawerConfig;
  barcodeScanner: BarcodeScannerConfig;
  customerDisplay: CustomerDisplayConfig;
  isConnected: {
    printer: boolean;
    cashDrawer: boolean;
    barcodeScanner: boolean;
    customerDisplay: boolean;
  };
}

class HardwareManager {
  private state: HardwareState;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.state = {
      printer: {
        enabled: false,
        type: 'thermal',
        connectionType: 'usb',
        paperWidth: 80,
        autoCut: true,
        printDensity: 80,
      },
      cashDrawer: {
        enabled: false,
        connectionType: 'printer',
        kickPin: 2,
        pulseDuration: 100,
      },
      barcodeScanner: {
        enabled: false,
        connectionType: 'usb-hid',
        autoSubmit: true,
      },
      customerDisplay: {
        enabled: false,
        connectionType: 'usb',
        brightness: 80,
      },
      isConnected: {
        printer: false,
        cashDrawer: false,
        barcodeScanner: false,
        customerDisplay: false,
      },
    };
  }

  /**
   * Initialize hardware devices
   */
  async initialize(): Promise<void> {
    console.log('[HardwareManager] Initializing hardware...');
    
    try {
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        await this.initializeElectronHardware();
      } else {
        // Browser environment - use Web APIs where available
        await this.initializeBrowserHardware();
      }
      
      console.log('[HardwareManager] Hardware initialized successfully');
    } catch (error) {
      console.error('[HardwareManager] Initialization error:', error);
    }
  }

  /**
   * Initialize hardware in Electron environment
   */
  private async initializeElectronHardware(): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    
    if (!electronAPI) {
      throw new Error('Electron API not available');
    }

    // Load saved configuration
    const config = await electronAPI.getHardwareConfig();
    if (config) {
      this.state = { ...this.state, ...config };
    }

    // Test connections
    if (this.state.printer.enabled) {
      this.state.isConnected.printer = await this.testPrinterConnection();
    }

    if (this.state.cashDrawer.enabled) {
      this.state.isConnected.cashDrawer = await this.testCashDrawerConnection();
    }

    if (this.state.barcodeScanner.enabled) {
      this.state.isConnected.barcodeScanner = await this.testBarcodeScannerConnection();
    }

    if (this.state.customerDisplay.enabled) {
      this.state.isConnected.customerDisplay = await this.testCustomerDisplayConnection();
    }
  }

  /**
   * Initialize hardware in browser environment
   */
  private async initializeBrowserHardware(): Promise<void> {
    // In browser, we can use Web Serial API and WebUSB API
    // These require user permission and secure context (HTTPS)
    
    if ('serial' in navigator) {
      console.log('[HardwareManager] Web Serial API available');
    }

    if ('usb' in navigator) {
      console.log('[HardwareManager] WebUSB API available');
    }

    // For now, mark as not connected in browser mode
    // Full implementation would require Web Serial/USB setup
  }

  /**
   * Print receipt
   */
  async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    if (!this.state.printer.enabled || !this.state.isConnected.printer) {
      console.warn('[HardwareManager] Printer not available');
      return false;
    }

    try {
      const receipt = this.generateReceipt(receiptData);
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.printReceipt(receipt, this.state.printer);
      } else {
        // Fallback to browser print
        this.browserPrint(receipt);
        return true;
      }
    } catch (error) {
      console.error('[HardwareManager] Print error:', error);
      return false;
    }
  }

  /**
   * Print Kitchen Order Ticket (KOT)
   */
  async printKOT(kotData: KOTData): Promise<boolean> {
    if (!this.state.printer.enabled || !this.state.isConnected.printer) {
      console.warn('[HardwareManager] Printer not available');
      return false;
    }

    try {
      const kot = this.generateKOT(kotData);
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.printKOT(kot, this.state.printer);
      } else {
        this.browserPrint(kot);
        return true;
      }
    } catch (error) {
      console.error('[HardwareManager] KOT print error:', error);
      return false;
    }
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(): Promise<boolean> {
    if (!this.state.cashDrawer.enabled || !this.state.isConnected.cashDrawer) {
      console.warn('[HardwareManager] Cash drawer not available');
      return false;
    }

    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.openCashDrawer(this.state.cashDrawer);
      }
      
      // If connected via printer, send ESC/POS command through printer
      if (this.state.cashDrawer.connectionType === 'printer') {
        return await this.sendCashDrawerCommand();
      }
      
      return false;
    } catch (error) {
      console.error('[HardwareManager] Cash drawer error:', error);
      return false;
    }
  }

  /**
   * Display text on customer display
   */
  async displayOnCustomerDisplay(line1: string, line2: string = ''): Promise<boolean> {
    if (!this.state.customerDisplay.enabled || !this.state.isConnected.customerDisplay) {
      console.warn('[HardwareManager] Customer display not available');
      return false;
    }

    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.displayOnCustomerDisplay(
          line1,
          line2,
          this.state.customerDisplay
        );
      }
      return false;
    } catch (error) {
      console.error('[HardwareManager] Customer display error:', error);
      return false;
    }
  }

  /**
   * Clear customer display
   */
  async clearCustomerDisplay(): Promise<boolean> {
    return this.displayOnCustomerDisplay('', '');
  }

  /**
   * Show total on customer display
   */
  async showTotal(amount: number): Promise<boolean> {
    return this.displayOnCustomerDisplay(
      'TOTAL:',
      `$${amount.toFixed(2)}`
    );
  }

  /**
   * Register barcode scan handler
   */
  onBarcodeScan(callback: (barcode: string) => void): void {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onBarcodeScan(callback);
    } else {
      // Browser fallback: listen for keyboard input
      this.setupKeyboardBarcodeListener(callback);
    }
  }

  /**
   * Update hardware configuration
   */
  async updateConfig(newConfig: Partial<HardwareState>): Promise<void> {
    this.state = { ...this.state, ...newConfig };
    
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.saveHardwareConfig(this.state);
    }

    this.emit('configUpdated', this.state);
  }

  /**
   * Get current hardware state
   */
  getState(): HardwareState {
    return { ...this.state };
  }

  /**
   * Test all connections
   */
  async testAllConnections(): Promise<{ [key: string]: boolean }> {
    const results = {
      printer: await this.testPrinterConnection(),
      cashDrawer: await this.testCashDrawerConnection(),
      barcodeScanner: await this.testBarcodeScannerConnection(),
      customerDisplay: await this.testCustomerDisplayConnection(),
    };

    this.state.isConnected = results;
    return results;
  }

  /**
   * Event listener registration
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(
        event,
        callbacks.filter(cb => cb !== callback)
      );
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // Private helper methods

  private async testPrinterConnection(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.testPrinterConnection(this.state.printer);
      }
      return false;
    } catch (error) {
      console.error('[HardwareManager] Printer test failed:', error);
      return false;
    }
  }

  private async testCashDrawerConnection(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.testCashDrawerConnection(this.state.cashDrawer);
      }
      return false;
    } catch (error) {
      console.error('[HardwareManager] Cash drawer test failed:', error);
      return false;
    }
  }

  private async testBarcodeScannerConnection(): Promise<boolean> {
    // Barcode scanners in HID mode appear as keyboards
    // We'll detect them by monitoring input patterns
    return this.state.barcodeScanner.enabled;
  }

  private async testCustomerDisplayConnection(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.testCustomerDisplayConnection(this.state.customerDisplay);
      }
      return false;
    } catch (error) {
      console.error('[HardwareManager] Customer display test failed:', error);
      return false;
    }
  }

  private async sendCashDrawerCommand(): Promise<boolean> {
    // Send ESC/POS command to open cash drawer via printer
    const ESC = '\x1B';
    const pulse = this.state.cashDrawer.kickPin === 2 ? '\x70\x00' : '\x70\x01';
    const duration = String.fromCharCode(Math.floor(this.state.cashDrawer.pulseDuration / 2));
    
    const command = ESC + pulse + duration + '\x00';
    
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return await (window as any).electronAPI.sendPrinterCommand(command);
    }
    return false;
  }

  private generateReceipt(data: ReceiptData): string {
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let receipt = '';
    
    // Initialize printer
    receipt += ESC + '@';
    
    // Set alignment to center
    receipt += ESC + 'a' + '\x01';
    
    // Restaurant name
    receipt += data.restaurantName + '\n';
    receipt += data.restaurantAddress + '\n';
    receipt += data.restaurantPhone + '\n';
    receipt += '\n';
    
    // Order info
    receipt += ESC + 'a' + '\x00'; // Left align
    receipt += `Order #: ${data.orderNumber}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Cashier: ${data.cashierName}\n`;
    receipt += '\n';
    
    // Separator
    receipt += '-'.repeat(32) + '\n';
    
    // Items
    data.items.forEach(item => {
      receipt += `${item.name}\n`;
      receipt += `  ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}\n`;
      if (item.notes) {
        receipt += `  Note: ${item.notes}\n`;
      }
    });
    
    receipt += '-'.repeat(32) + '\n';
    
    // Totals
    receipt += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
    receipt += `Tax (${data.taxRate}%): $${data.tax.toFixed(2)}\n`;
    if (data.discount > 0) {
      receipt += `Discount: -$${data.discount.toFixed(2)}\n`;
    }
    receipt += ESC + 'E' + '\x01'; // Bold
    receipt += `TOTAL: $${data.total.toFixed(2)}\n`;
    receipt += ESC + 'E' + '\x00'; // Normal
    
    receipt += '\n';
    
    // Payment info
    receipt += `Payment: ${data.paymentMethod}\n`;
    if (data.change > 0) {
      receipt += `Change: $${data.change.toFixed(2)}\n`;
    }
    
    receipt += '\n';
    
    // Footer
    receipt += ESC + 'a' + '\x01'; // Center
    receipt += 'Thank you for your visit!\n';
    receipt += 'Please come again\n';
    
    // Cut paper
    receipt += GS + 'V' + '\x00';
    
    return receipt;
  }

  private generateKOT(data: KOTData): string {
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let kot = '';
    
    // Initialize
    kot += ESC + '@';
    
    // Header
    kot += ESC + 'a' + '\x01'; // Center
    kot += ESC + 'B' + '\x01'; // Bold
    kot += 'KITCHEN ORDER TICKET\n';
    kot += ESC + 'B' + '\x00'; // Normal
    kot += ESC + 'a' + '\x00'; // Left
    
    kot += `\nTicket #: ${data.ticketNumber}\n`;
    kot += `Order #: ${data.orderNumber}\n`;
    kot += `Time: ${new Date().toLocaleTimeString()}\n`;
    kot += `Table: ${data.tableNumber || 'N/A'}\n`;
    kot += `Type: ${data.orderType}\n`;
    
    kot += '\n' + '='.repeat(32) + '\n\n';
    
    // Items
    data.items.forEach((item, index) => {
      kot += ESC + 'B' + '\x01'; // Bold
      kot += `${index + 1}. ${item.name}\n`;
      kot += ESC + 'B' + '\x00'; // Normal
      kot += `   Qty: ${item.quantity}\n`;
      
      if (item.modifiers && item.modifiers.length > 0) {
        kot += `   Modifiers: ${item.modifiers.join(', ')}\n`;
      }
      
      if (item.notes) {
        kot += ESC + '!' + '\x10'; // Double height
        kot += `   *** ${item.notes} ***\n`;
        kot += ESC + '!' + '\x00'; // Normal
      }
      
      kot += '\n';
    });
    
    kot += '='.repeat(32) + '\n';
    
    // Special instructions
    if (data.specialInstructions) {
      kot += ESC + '!' + '\x10';
      kot += `SPECIAL: ${data.specialInstructions}\n`;
      kot += ESC + '!' + '\x00';
    }
    
    // Cut paper
    kot += GS + 'V' + '\x00';
    
    return kot;
  }

  private browserPrint(content: string): void {
    // Create a hidden iframe for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px;
                margin: 0;
                padding: 10px;
              }
              pre { 
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <pre>${content.replace(/\x1B|\x1D/g, '')}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  private setupKeyboardBarcodeListener(callback: (barcode: string) => void): void {
    let barcodeBuffer = '';
    let lastKeyTime = 0;
    const SCAN_TIMEOUT = 50; // ms between keystrokes
    
    document.addEventListener('keydown', (event) => {
      const currentTime = Date.now();
      
      // If too much time passed, reset buffer
      if (currentTime - lastKeyTime > SCAN_TIMEOUT) {
        barcodeBuffer = '';
      }
      
      lastKeyTime = currentTime;
      
      // Only capture alphanumeric keys
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        barcodeBuffer += event.key;
        
        // If Enter is pressed, submit barcode
        if (event.key === 'Enter' && barcodeBuffer.length > 3) {
          event.preventDefault();
          callback(barcodeBuffer);
          barcodeBuffer = '';
        }
      }
    });
  }
}

// Data interfaces
export interface ReceiptData {
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  orderNumber: string;
  cashierName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  paymentMethod: string;
  change: number;
}

export interface KOTData {
  ticketNumber: string;
  orderNumber: string;
  tableNumber?: string;
  orderType: string;
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
    notes?: string;
  }>;
  specialInstructions?: string;
}

// Singleton instance
let hardwareManager: HardwareManager | null = null;

export function getHardwareManager(): HardwareManager {
  if (!hardwareManager) {
    hardwareManager = new HardwareManager();
  }
  return hardwareManager;
}

export default HardwareManager;
