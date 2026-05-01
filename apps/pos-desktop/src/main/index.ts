import { app, BrowserWindow, ipcMain, screen, safeStorage } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import Store from 'electron-store';
import log from 'electron-log';
import { setupHardwareHandlers } from './hardware-handlers';
import fs from 'fs';

// Configure logging
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let db: Database.Database;

// Secure storage path
const secureStoragePath = path.join(app.getPath('userData'), 'secure-storage');

// Ensure secure storage directory exists
if (!fs.existsSync(secureStoragePath)) {
  fs.mkdirSync(secureStoragePath, { recursive: true });
}

// Helper function to get secure file path
function getSecureFilePath(key: string): string {
  // Sanitize key to prevent path traversal
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(secureStoragePath, `${sanitizedKey}.enc`);
}

// Secure storage functions using safeStorage.
// QA B5: write secrets with mode 0o600 so other users on the host can't read them.
async function secureSetItem(key: string, value: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const encrypted = safeStorage.encryptString(value);
  const filePath = getSecureFilePath(key);
  fs.writeFileSync(filePath, encrypted, { mode: 0o600 });
}

async function secureGetItem(key: string): Promise<string | null> {
  const filePath = getSecureFilePath(key);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const encrypted = fs.readFileSync(filePath);
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    log.error(`Failed to decrypt secure storage for key: ${key}`, error);
    throw new Error('Failed to decrypt secure storage data');
  }
}

async function secureRemoveItem(key: string): Promise<void> {
  const filePath = getSecureFilePath(key);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Initialize local database for offline mode
function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pos-local.db');
  db = new Database(dbPath);
  
  // Enable WAL mode for better performance and concurrent access
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  
  createTables();
  log.info(`Offline database initialized at: ${dbPath}`);
}

function createTables() {
  // Orders table for offline queue
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      orderNumber TEXT UNIQUE NOT NULL,
      orderType TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      customerId TEXT,
      customerName TEXT,
      customerPhone TEXT,
      tableId TEXT,
      subtotal REAL NOT NULL,
      discountAmount REAL DEFAULT 0,
      taxAmount REAL DEFAULT 0,
      totalAmount REAL NOT NULL,
      paidAmount REAL DEFAULT 0,
      paymentMethod TEXT,
      paymentStatus TEXT DEFAULT 'PENDING',
      cashierId TEXT NOT NULL,
      notes TEXT,
      kitchenNotes TEXT,
      orderedAt TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      syncError TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      menuItemId TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      totalPrice REAL NOT NULL,
      notes TEXT,
      modifiers TEXT,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      reference TEXT,
      status TEXT DEFAULT 'PAID',
      paidAt TEXT DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // Sync metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
    CREATE INDEX IF NOT EXISTS idx_orders_orderedAt ON orders(orderedAt);
    CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
    CREATE INDEX IF NOT EXISTS idx_payments_orderId ON payments(orderId);
  `);
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(width, 1920),
    height: Math.min(height, 1080),
    minWidth: 1280,
    minHeight: 720,
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Maximize on ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5176');
    // Open DevTools but suppress non-critical warnings
    mainWindow.webContents.openDevTools();
    
    // Suppress common DevTools warnings
    mainWindow.webContents.on('console-message', (event, level, message) => {
      // Filter out known non-critical warnings
      if (message.includes('dragEvent is not defined') ||
          message.includes('Failed to fetch') && message.includes('devtools://')) {
        return; // Ignore these DevTools internal errors
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
// QA B3: caller-frame check. A renderer with an exploitable XSS or a malicious
// embedded iframe can call ipcRenderer.invoke with the same channel name. Verify
// the call came from the top-level frame of the main window before honoring
// any privileged operation (DB query, secure-storage, hardware control). The
// check is a no-op in dev so devtools / hot-reload still work.
function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  if (!app.isPackaged) return true; // dev: trust all
  if (!mainWindow) return false;
  const mainContents = mainWindow.webContents;
  if (event.sender !== mainContents) return false;
  // senderFrame.parent === null means top frame (Electron API)
  const sf: any = (event as any).senderFrame;
  if (sf && sf.parent !== null && sf.parent !== undefined) {
    log.warn(`IPC denied: sender came from a sub-frame (url=${sf.url})`);
    return false;
  }
  return true;
}

function denyUntrusted(channel: string) {
  log.warn(`IPC denied on ${channel}: untrusted sender`);
  return { success: false, error: 'IPC sender not trusted' };
}

app.whenReady().then(() => {
  // Initialize offline database
  initializeDatabase();
  log.info('Offline database initialized successfully');

  // Track in-flight queries so we can drain on quit (QA B4).
  let inFlightQueries = 0;

  // Register IPC handlers after app is ready
  ipcMain.handle('db-query', (event, sql, params = []) => {
    try {
      if (!isTrustedSender(event)) return denyUntrusted('db-query');
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      // QA B1: bound the params payload so a malicious renderer can't DOS the
      // main process with a 10MB array of bindings.
      if (!Array.isArray(params)) {
        return { success: false, error: 'params must be an array' };
      }
      if (params.length > 50) {
        return { success: false, error: 'params length exceeds 50' };
      }
      for (const p of params) {
        const t = typeof p;
        if (p !== null && t !== 'string' && t !== 'number' && t !== 'boolean') {
          return { success: false, error: `params item type ${t} not supported` };
        }
        if (t === 'string' && (p as string).length > 4096) {
          return { success: false, error: 'param string too long' };
        }
      }

      const normalizedSql = sql.trim().toUpperCase();

      if (!normalizedSql.startsWith('SELECT')) {
        log.warn('db-query rejected non-SELECT statement');
        return { success: false, error: 'Only SELECT queries are permitted' };
      }

      const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|ATTACH|PRAGMA)\b/i;
      if (forbidden.test(sql)) {
        log.warn('db-query rejected SQL containing forbidden keywords');
        return { success: false, error: 'Query contains forbidden SQL keywords' };
      }

      inFlightQueries++;
      try {
        const stmt = db.prepare(sql);
        const result = stmt.all(params);
        return { success: true, data: result };
      } finally {
        inFlightQueries--;
      }
    } catch (error) {
      log.error('Database query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Expose drain helper for graceful shutdown.
  (global as any).__drainDb = async () => {
    const start = Date.now();
    while (inFlightQueries > 0 && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      path: app.getPath('userData'),
      isPackaged: app.isPackaged,
      platform: process.platform,
    };
  });

  // Secure storage IPC handlers
  ipcMain.handle('secure-set-item', async (event, key: string, value: string) => {
    if (!isTrustedSender(event)) return denyUntrusted('secure-set-item');
    try {
      await secureSetItem(key, value);
      return { success: true };
    } catch (error) {
      log.error('secure-set-item error:', error);
      throw error;
    }
  });

  ipcMain.handle('secure-get-item', async (event, key: string) => {
    if (!isTrustedSender(event)) return denyUntrusted('secure-get-item');
    try {
      const value = await secureGetItem(key);
      return value;
    } catch (error) {
      log.error('secure-get-item error:', error);
      throw error;
    }
  });

  ipcMain.handle('secure-remove-item', async (event, key: string) => {
    if (!isTrustedSender(event)) return denyUntrusted('secure-remove-item');
    try {
      await secureRemoveItem(key);
      return { success: true };
    } catch (error) {
      log.error('secure-remove-item error:', error);
      throw error;
    }
  });

  // Setup hardware handlers
  const hardwareConfigPath = path.join(app.getPath('userData'), 'hardware-config.json');
  setupHardwareHandlers(hardwareConfigPath);
  log.info('Hardware handlers initialized');

  createWindow();

  // QA B2: apply CSP in dev too. Dev uses Vite HMR which needs 'unsafe-inline'
  // for the preamble; production locks that down.
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (mainWindow) {
    const devCsp = "default-src 'self' http://localhost:* ws://localhost:*; " +
      "script-src 'self' 'unsafe-inline' http://localhost:*; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' http://localhost:* ws://localhost:*";
    const prodCsp = "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; " +
      "connect-src 'self' " + (process.env.API_BASE_URL || '');

    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [isDev ? devCsp : prodCsp],
        },
      });
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  log.error('Failed to initialize app:', error);
  console.error('Failed to initialize app:', error);
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // QA B4: drain in-flight queries before closing the connection.
    await (global as any).__drainDb?.();
    db?.close();
    app.quit();
  }
});

app.on('before-quit', async () => {
  await (global as any).__drainDb?.();
  db?.close();
});

// Security: Disable navigation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
});
