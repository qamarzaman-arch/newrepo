import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Database operations
  dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db-query', sql, params),

  // Store operations
  storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
  storeSet: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Platform info
  platform: process.platform,
});
