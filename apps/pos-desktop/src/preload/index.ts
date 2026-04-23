import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db-query', sql, params),

  // Store operations (legacy - using electron-store)
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),

  // Secure storage operations (using safeStorage)
  secureSetItem: (key: string, value: string) => ipcRenderer.invoke('secure-set-item', key, value),
  secureGetItem: (key: string) => ipcRenderer.invoke('secure-get-item', key),
  secureRemoveItem: (key: string) => ipcRenderer.invoke('secure-remove-item', key),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Platform info
  platform: process.platform,

  // Hardware operations
  getHardwareConfig: () => ipcRenderer.invoke('hardware:get-config'),
  saveHardwareConfig: (config: any) => ipcRenderer.invoke('hardware:save-config', config),
  
  testPrinterConnection: (printerConfig: any) => ipcRenderer.invoke('hardware:test-printer', printerConfig),
  printReceipt: (receipt: string, printerConfig: any) => ipcRenderer.invoke('hardware:print-receipt', receipt, printerConfig),
  printKOT: (kot: string, printerConfig: any) => ipcRenderer.invoke('hardware:print-kot', kot, printerConfig),
  sendPrinterCommand: (command: string) => ipcRenderer.invoke('hardware:send-printer-command', command),
  
  openCashDrawer: (cashDrawerConfig: any) => ipcRenderer.invoke('hardware:open-cash-drawer', cashDrawerConfig),
  testCashDrawerConnection: (cashDrawerConfig: any) => ipcRenderer.invoke('hardware:test-cash-drawer', cashDrawerConfig),
  
  displayOnCustomerDisplay: (line1: string, line2: string, displayConfig: any) => 
    ipcRenderer.invoke('hardware:display-customer', line1, line2, displayConfig),
  testCustomerDisplayConnection: (displayConfig: any) => ipcRenderer.invoke('hardware:test-customer-display', displayConfig),
  
  listSerialPorts: () => ipcRenderer.invoke('hardware:list-ports'),
  setupBarcodeScanner: (scannerConfig: any) => ipcRenderer.invoke('hardware:setup-barcode-scanner', scannerConfig),
  closeAllHardware: () => ipcRenderer.invoke('hardware:close-all'),
  
  // Barcode scan event listener
  onBarcodeScan: (callback: (barcode: string) => void) => {
    ipcRenderer.on('barcode-scanned', (_, barcode) => callback(barcode));
  },
});
