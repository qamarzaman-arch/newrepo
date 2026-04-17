import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import Store from 'electron-store';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let db: Database.Database;

// Initialize local database
function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pos-local.db');
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  createTables();

  log.info(`Database initialized at: ${dbPath}`);
}

function createTables() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT,
      phone TEXT,
      avatar TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2) NOT NULL,
      image TEXT,
      sku TEXT,
      barcode TEXT,
      is_active BOOLEAN DEFAULT 1,
      is_available BOOLEAN DEFAULT 1,
      prep_time_minutes INTEGER DEFAULT 15,
      tax_rate DECIMAL(5,2) DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES menu_categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      order_type TEXT NOT NULL,
      status TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      table_id TEXT,
      subtotal DECIMAL(10,2) NOT NULL,
      discount_amount DECIMAL(10,2) DEFAULT 0,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      surcharge_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      paid_amount DECIMAL(10,2) DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'PENDING',
      cashier_id TEXT NOT NULL,
      server_id TEXT,
      notes TEXT,
      kitchen_notes TEXT,
      ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME,
      completed_at DATETIME,
      cancelled_at DATETIME,
      cancel_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      notes TEXT,
      modifiers TEXT,
      status TEXT DEFAULT 'NEW',
      sent_to_kitchen_at DATETIME,
      prepared_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE NOT NULL,
      address TEXT,
      city TEXT,
      date_of_birth DATETIME,
      loyalty_points INTEGER DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      total_spent DECIMAL(10,2) DEFAULT 0,
      last_visit_at DATETIME,
      preferences TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'AVAILABLE',
      location TEXT,
      shape TEXT,
      is_active BOOLEAN DEFAULT 1,
      pos_x INTEGER,
      pos_y INTEGER,
      width INTEGER,
      height INTEGER,
      current_order_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      model_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      synced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active, is_available);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  log.info('Database tables created/verified');
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
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('db-query', (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return { success: true, data: stmt.all(...params) };
    } else {
      const result = stmt.run(...params);
      return { success: true, data: { lastInsertRowid: result.lastInsertRowid, changes: result.changes } };
    }
  } catch (error: any) {
    log.error('Database query error:', error);
    return { success: false, error: error.message };
  }
});

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

// App lifecycle
app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db?.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  db?.close();
});

// Security: Disable navigation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
});
