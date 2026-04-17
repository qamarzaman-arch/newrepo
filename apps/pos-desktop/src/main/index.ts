import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
// import Database from 'better-sqlite3'; // Temporarily disabled - requires C++ build tools
import Store from 'electron-store';
import log from 'electron-log';
import { setupHardwareHandlers } from './hardware-handlers';

// Configure logging
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

const store = new Store();
let mainWindow: BrowserWindow | null = null;
// let db: Database.Database; // Temporarily disabled

// Initialize local database - TEMPORARILY DISABLED
// function initializeDatabase() {
//   const dbPath = path.join(app.getPath('userData'), 'pos-local.db');
//   db = new Database(dbPath);
//   db.pragma('journal_mode = WAL');
//   db.pragma('foreign_keys = ON');
//   createTables();
//   log.info(`Database initialized at: ${dbPath}`);
// }

// function createTables() {
//   db.exec(`...`);
// }

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

// IPC Handlers
ipcMain.handle('db-query', (event, sql, params = []) => {
  // Temporarily disabled - better-sqlite3 not available
  log.warn('Database queries are currently disabled. Install better-sqlite3 to enable.');
  return { success: false, error: 'Database not available - better-sqlite3 requires C++ build tools' };
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
  // initializeDatabase(); // Temporarily disabled - better-sqlite3 requires C++ build tools
  log.info('Database initialization skipped (better-sqlite3 not available)');
  
  // Setup hardware handlers
  const hardwareConfigPath = path.join(app.getPath('userData'), 'hardware-config.json');
  setupHardwareHandlers(hardwareConfigPath);
  log.info('Hardware handlers initialized');
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // db?.close(); // Temporarily disabled
    app.quit();
  }
});

app.on('before-quit', () => {
  // db?.close(); // Temporarily disabled
});

// Security: Disable navigation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
});
