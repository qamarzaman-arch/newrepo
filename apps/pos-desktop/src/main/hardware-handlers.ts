/**
 * Electron IPC Handlers for Hardware Integration
 * Handles communication between renderer and main process for hardware devices
 */

import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Optional serialport - will be loaded dynamically if available
let SerialPort: any = null;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) {
  console.warn('[Hardware] serialport module not available');
}

// Store active connections
const activePorts = new Map<string, any>();
let barcodeBuffer = '';
let lastBarcodeTime = 0;

/**
 * QA B83: race a printer write against a hard timeout so a stuck printer
 * doesn't hang the renderer indefinitely.
 */
async function withTimeout<T>(fn: () => Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(label)), ms)
    ),
  ]);
}

/**
 * QA B81: encode the receipt string in the printer's character set instead of
 * the lossy 'binary' codec. CP858 covers most Western glyphs (€, ñ, accented
 * characters); CP437 is the widest-supported fallback. The renderer can
 * declare which codepage its template targets via printerConfig.codepage.
 *
 * This function is intentionally simple — it doesn't attempt CJK/Indic
 * transliteration. If the caller needs proper Unicode support they should use
 * an ESC/POS-aware library (escpos-buffer) and pass the resulting Buffer.
 */
function encodeForPrinter(text: string | Buffer, printerConfig: any): Buffer {
  if (Buffer.isBuffer(text)) return text;
  const codepage = (printerConfig?.codepage || 'cp437').toLowerCase();
  // Node only ships latin1/ascii/utf8/etc out of the box. cp437/cp858 are
  // close enough to latin1 for the printable ASCII range; if a real codec is
  // available via iconv-lite we use it.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const iconv = require('iconv-lite');
    if (iconv.encodingExists(codepage)) {
      return iconv.encode(text, codepage);
    }
  } catch {
    /* iconv-lite not installed; fall through */
  }
  return Buffer.from(text, 'latin1');
}

/**
 * QA B82: 58mm vs 80mm width handling. Reflow the receipt body to the
 * configured paper width so 80mm printers don't print extra padding.
 */
function reflowReceipt(text: string, printerConfig: any): string {
  const width = printerConfig?.paperWidth === 80 ? 48 : 32;
  return text
    .split('\n')
    .map((line) => (line.length > width ? line.match(new RegExp(`.{1,${width}}`, 'g'))?.join('\n') ?? line : line))
    .join('\n');
}

/**
 * Setup all hardware-related IPC handlers
 */
export function setupHardwareHandlers(configPath: string): void {
  
  /**
   * Get hardware configuration
   */
  ipcMain.handle('hardware:get-config', async () => {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config;
      }
      return null;
    } catch (error) {
      console.error('[Hardware] Error reading config:', error);
      return null;
    }
  });

  /**
   * Save hardware configuration
   */
  ipcMain.handle('hardware:save-config', async (_, config) => {
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('[Hardware] Error saving config:', error);
      return false;
    }
  });

  /**
   * Test printer connection
   */
  ipcMain.handle('hardware:test-printer', async (_, printerConfig) => {
    try {
      if (printerConfig.connectionType === 'usb') {
        // Try to open USB port
        const port = await openSerialPort(printerConfig.devicePath);
        if (port) {
          // Send test command
          await port.write(Buffer.from([0x1B, 0x40])); // Initialize
          await port.close();
          return true;
        }
      } else if (printerConfig.connectionType === 'network') {
        // Test network connection
        const net = require('net');
        return new Promise((resolve) => {
          const socket = net.connect(
            printerConfig.port || 9100,
            printerConfig.ipAddress,
            () => {
              socket.end();
              resolve(true);
            }
          );
          socket.on('error', () => resolve(false));
          setTimeout(() => {
            socket.destroy();
            resolve(false);
          }, 3000);
        });
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Printer test failed:', error);
      return false;
    }
  });

  /**
   * Print receipt
   */
  ipcMain.handle('hardware:print-receipt', async (_, receipt, printerConfig) => {
    try {
      if (printerConfig.connectionType === 'usb' || printerConfig.connectionType === 'serial') {
        // QA B83: printer hangs become silent failures. Race the write against
        // a 3s timeout so the IPC always resolves and the UI can toast.
        return await withTimeout(async () => {
          const port = await openSerialPort(printerConfig.devicePath);
          if (!port) return false;
          // QA B81: avoid the 'binary' encoding path for ESC/POS — it corrupts
          // multi-byte glyphs (₹, €, ñ). Use the configured codepage if the
          // caller built the buffer themselves; otherwise re-encode.
          await port.write(encodeForPrinter(receipt, printerConfig));
          await new Promise(resolve => setTimeout(resolve, 500));
          await port.close();
          return true;
        }, 3000, '[Hardware] print-receipt timed out');
      } else if (printerConfig.connectionType === 'network') {
        return await printToNetworkPrinter(receipt, printerConfig);
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Print receipt failed:', error);
      return false;
    }
  });

  /**
   * Print KOT
   */
  ipcMain.handle('hardware:print-kot', async (_, kot, printerConfig) => {
    try {
      if (printerConfig.connectionType === 'usb' || printerConfig.connectionType === 'serial') {
        return await withTimeout(async () => {
          const port = await openSerialPort(printerConfig.devicePath);
          if (!port) return false;
          await port.write(encodeForPrinter(reflowReceipt(kot, printerConfig), printerConfig));
          await new Promise(resolve => setTimeout(resolve, 500));
          await port.close();
          return true;
        }, 3000, '[Hardware] print-kot timed out');
      } else if (printerConfig.connectionType === 'network') {
        return await printToNetworkPrinter(kot, printerConfig);
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Print KOT failed:', error);
      return false;
    }
  });

  /**
   * Open cash drawer
   */
  ipcMain.handle('hardware:open-cash-drawer', async (_, cashDrawerConfig) => {
    try {
      if (cashDrawerConfig.connectionType === 'printer') {
        // Send pulse through printer
        const ESC = 0x1B;
        const pin = cashDrawerConfig.kickPin === 2 ? 0 : 1;
        const duration = Math.floor(cashDrawerConfig.pulseDuration / 2);
        
        const command = Buffer.from([ESC, 0x70, pin, duration, 0]);
        
        if (cashDrawerConfig.printerDevicePath) {
          const port = await openSerialPort(cashDrawerConfig.printerDevicePath);
          if (port) {
            await port.write(command);
            await new Promise(resolve => setTimeout(resolve, 200));
            await port.close();
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Cash drawer failed:', error);
      return false;
    }
  });

  /**
   * Display on customer display
   */
  ipcMain.handle('hardware:display-customer', async (_, line1, line2, displayConfig) => {
    try {
      if (displayConfig.connectionType === 'usb' || displayConfig.connectionType === 'serial') {
        const port = await openSerialPort(displayConfig.devicePath);
        if (port) {
          // Clear display
          await port.write(Buffer.from([0x0C]));
          
          // Position cursor at line 1
          await port.write(Buffer.from([0x1B, 0x58, 0x00, 0x00]));
          await port.write(Buffer.from(line1.substring(0, 20)));
          
          // Position cursor at line 2
          await port.write(Buffer.from([0x1B, 0x58, 0x01, 0x00]));
          await port.write(Buffer.from(line2.substring(0, 20)));
          
          await new Promise(resolve => setTimeout(resolve, 100));
          await port.close();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Customer display failed:', error);
      return false;
    }
  });

  /**
   * Test cash drawer connection
   */
  ipcMain.handle('hardware:test-cash-drawer', async (_, cashDrawerConfig) => {
    try {
      // Try to open and close drawer
      return await ipcMain.emit('hardware:open-cash-drawer', null, cashDrawerConfig);
    } catch (error) {
      console.error('[Hardware] Cash drawer test failed:', error);
      return false;
    }
  });

  /**
   * Test customer display connection
   */
  ipcMain.handle('hardware:test-customer-display', async (_, displayConfig) => {
    try {
      return await ipcMain.emit(
        'hardware:display-customer',
        null,
        'TEST',
        'Connection OK',
        displayConfig
      );
    } catch (error) {
      console.error('[Hardware] Customer display test failed:', error);
      return false;
    }
  });

  /**
   * Send raw command to printer
   */
  ipcMain.handle('hardware:send-printer-command', async (_, command, printerConfig) => {
    try {
      if (printerConfig?.devicePath) {
        const port = await openSerialPort(printerConfig.devicePath);
        if (port) {
          await port.write(Buffer.from(command, 'binary'));
          await port.close();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Send command failed:', error);
      return false;
    }
  });

  /**
   * List available serial ports
   */
  ipcMain.handle('hardware:list-ports', async () => {
    try {
      if (!SerialPort) return [];
      const ports = await SerialPort.list();
      return ports.map((port: any) => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        productId: port.productId,
        vendorId: port.vendorId,
      }));
    } catch (error) {
      console.error('[Hardware] List ports failed:', error);
      return [];
    }
  });

  /**
   * Setup barcode scanner listener
   */
  ipcMain.handle('hardware:setup-barcode-scanner', async (_, scannerConfig, mainWindow) => {
    try {
      if (scannerConfig.connectionType === 'usb-hid') {
        // HID mode scanners act as keyboards - handled in renderer
        return true;
      } else if (scannerConfig.connectionType === 'usb-serial') {
        // Serial mode - listen for data
        const port = await openSerialPort(scannerConfig.devicePath);
        if (port) {
          port.on('data', (data: Buffer) => {
            const now = Date.now();
            const text = data.toString();
            
            // Check for timeout
            if (now - lastBarcodeTime > 100) {
              barcodeBuffer = '';
            }
            
            lastBarcodeTime = now;
            barcodeBuffer += text;
            
            // Check for suffix (usually Enter)
            if (text.includes('\n') || text.includes('\r')) {
              const barcode = barcodeBuffer.trim();
              if (barcode.length > 3) {
                mainWindow.webContents.send('barcode-scanned', barcode);
              }
              barcodeBuffer = '';
            }
          });
          
          activePorts.set('barcode-scanner', port);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[Hardware] Barcode scanner setup failed:', error);
      return false;
    }
  });

  /**
   * Close all ports
   */
  ipcMain.handle('hardware:close-all', async () => {
    try {
      for (const [name, port] of activePorts.entries()) {
        if (port.isOpen) {
          await port.close();
        }
      }
      activePorts.clear();
      return true;
    } catch (error) {
      console.error('[Hardware] Close all failed:', error);
      return false;
    }
  });
}

/**
 * Helper: Open serial port
 */
async function openSerialPort(devicePath?: string): Promise<any | null> {
  if (!devicePath) {
    return null;
  }

  try {
    const port = new SerialPort({
      path: devicePath,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
    });

    return new Promise((resolve, reject) => {
      port.on('open', () => resolve(port));
      port.on('error', (err: Error) => {
        console.error('[Hardware] Port error:', err);
        reject(err);
      });
      
      // Timeout after 3 seconds
      setTimeout(() => {
        reject(new Error('Port open timeout'));
      }, 3000);
    });
  } catch (error) {
    console.error('[Hardware] Failed to open port:', error);
    return null;
  }
}

/**
 * Helper: Print to network printer
 */
async function printToNetworkPrinter(content: string, printerConfig: any): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = net.connect(
      printerConfig.port || 9100,
      printerConfig.ipAddress,
      () => {
        socket.write(Buffer.from(content, 'binary'));
        setTimeout(() => {
          socket.end();
          resolve(true);
        }, 500);
      }
    );
    
    socket.on('error', (err: Error) => {
      console.error('[Hardware] Network print error:', err);
      resolve(false);
    });
    
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 5000);
  });
}
