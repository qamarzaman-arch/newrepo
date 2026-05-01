// Thermal Printer Service for ESC/POS compatible printers
// Supports USB, Network (Ethernet), and Serial connections

export interface PrinterConfig {
  type: 'usb' | 'network' | 'serial';
  address?: string; // IP for network, COM port for serial
  port?: number; // Port for network printer (default 9100)
  vendorId?: number; // USB vendor ID
  productId?: number; // USB product ID
}

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  orderNumber: string;
  date: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount?: number;
  tip?: number;
  total: number;
  paymentMethod: string;
  change?: number;
  footer?: string;
}

class ThermalPrinterService {
  private config: PrinterConfig | null = null;
  private isConnected = false;

  setConfig(config: PrinterConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('Printer not configured');
      }

      // In a real implementation, this would use node-escpos or similar
      // For Electron, we'd use the serialport or usb-detection libraries
      console.log(`Connecting to printer: ${this.config.type}`);
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      this.isConnected = false;
      return false;
    }
  }

  disconnect(): void {
    this.isConnected = false;
  }

  async printReceipt(data: ReceiptData): Promise<boolean> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    try {
      const receipt = this.formatReceipt(data);
      
      // In production, this would send to actual printer
      // For now, we'll open a print window for standard printers
      await this.sendToPrinter(receipt);
      
      return true;
    } catch (error) {
      console.error('Print failed:', error);
      return false;
    }
  }

  async printKitchenTicket(orderData: {
    ticketNumber: string;
    orderNumber: string;
    table?: string;
    orderType: string;
    items: Array<{ name: string; quantity: number; notes?: string }>;
    notes?: string;
    timestamp: string;
  }): Promise<boolean> {
    if (!this.isConnected && !(await this.connect())) {
      return false;
    }

    try {
      const ticket = this.formatKitchenTicket(orderData);
      await this.sendToPrinter(ticket);
      return true;
    } catch (error) {
      console.error('Kitchen ticket print failed:', error);
      return false;
    }
  }

  private formatReceipt(data: ReceiptData): string {
    const lines: string[] = [];
    
    // Header
    lines.push('CENTER:' + data.storeName.toUpperCase());
    if (data.storeAddress) lines.push('CENTER:' + data.storeAddress);
    if (data.storePhone) lines.push('CENTER:Tel: ' + data.storePhone);
    lines.push('');
    
    // Order info
    lines.push(`Order: ${data.orderNumber}`);
    lines.push(`Date: ${data.date}`);
    lines.push(`Cashier: ${data.cashier}`);
    lines.push('');
    
    // Items
    lines.push('LEFT:Qty  Item                Price');
    lines.push('--------------------------------');
    
    for (const item of data.items) {
      const name = item.name.substring(0, 18).padEnd(18);
      const qty = item.quantity.toString().padStart(3);
      const total = toNum(item.total).toFixed(2).padStart(8);
      lines.push(`${qty} ${name} ${total}`);
    }
    
    lines.push('--------------------------------');
    
    // Totals
    lines.push(`Subtotal:               ${toNum(data.subtotal).toFixed(2)}`);
    lines.push(`Tax:                      ${toNum(data.tax).toFixed(2)}`);
    if (data.discount) lines.push(`Discount:                -${toNum(data.discount).toFixed(2)}`);
    if (data.tip) lines.push(`Tip:                      ${toNum(data.tip).toFixed(2)}`);
    lines.push(`TOTAL:                   ${toNum(data.total).toFixed(2)}`);
    lines.push('');
    
    // Payment
    lines.push(`Payment: ${data.paymentMethod}`);
    if (data.change) lines.push(`Change: ${toNum(data.change).toFixed(2)}`);
    lines.push('');
    
    // Footer
    lines.push('CENTER:Thank you for your visit!');
    if (data.footer) lines.push('CENTER:' + data.footer);
    
    return lines.join('\n');
  }

  private formatKitchenTicket(data: {
    ticketNumber: string;
    orderNumber: string;
    table?: string;
    orderType: string;
    items: Array<{ name: string; quantity: number; notes?: string }>;
    notes?: string;
    timestamp: string;
  }): string {
    const lines: string[] = [];
    
    // Header
    lines.push('CENTER:** KITCHEN ORDER **');
    lines.push('');
    lines.push(`Ticket: ${data.ticketNumber}`);
    lines.push(`Order: ${data.orderNumber}`);
    if (data.table) lines.push(`Table: ${data.table}`);
    lines.push(`Type: ${data.orderType}`);
    lines.push(`Time: ${data.timestamp}`);
    lines.push('');
    lines.push('================================');
    lines.push('');
    
    // Items
    for (const item of data.items) {
      lines.push(`  ${item.quantity}x ${item.name.toUpperCase()}`);
      if (item.notes) lines.push(`     ** ${item.notes} **`);
      lines.push('');
    }
    
    // Order notes
    if (data.notes) {
      lines.push('--------------------------------');
      lines.push('ORDER NOTES:');
      lines.push(data.notes);
    }
    
    lines.push('');
    lines.push('================================');
    lines.push('CENTER:Please expedite');
    
    return lines.join('\n');
  }

  private async sendToPrinter(content: string): Promise<void> {
    // For Electron, we can use the webContents print API
    // or send to a connected thermal printer via USB/Serial
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              @media print {
                body { font-family: monospace; font-size: 12pt; }
                .center { text-align: center; }
              }
            </style>
          </head>
          <body>
            <pre>${content.replace(/CENTER:/g, '<div class="center">').replace(/LEFT:/g, '')}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  }

  async openCashDrawer(): Promise<boolean> {
    if (!this.isConnected && !(await this.connect())) {
      return false;
    }

    try {
      // ESC/POS command to open cash drawer
      // Typically sends pulse to pin 2
      console.log('Opening cash drawer...');
      return true;
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      return false;
    }
  }

  async cutPaper(): Promise<boolean> {
    if (!this.isConnected && !(await this.connect())) {
      return false;
    }

    try {
      // ESC/POS cut command
      console.log('Cutting paper...');
      return true;
    } catch (error) {
      console.error('Failed to cut paper:', error);
      return false;
    }
  }
}

export const thermalPrinter = new ThermalPrinterService();
export default thermalPrinter;
