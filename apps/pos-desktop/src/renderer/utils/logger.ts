/**
 * Structured Logger for POS Desktop
 * Replaces console.log with proper log levels and context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private context: string;
  private logLevel: LogLevel;
  private readonly STORAGE_KEY = 'pos_logs';
  private readonly MAX_LOGS = 1000;

  constructor(context: string = 'App', level: LogLevel = 'info') {
    this.context = context;
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: `[${this.context}] ${message}`,
      context: this.context,
      data: data ? this.sanitizeData(data) : undefined,
    };
  }

  private sanitizeData(data: any): any {
    // Remove sensitive fields from logs
    if (typeof data !== 'object' || data === null) return data;
    
    const sensitiveFields = ['password', 'token', 'pin', 'creditCard', 'cvv', 'passwordHash'];
    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private storeLog(entry: LogEntry): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only last N logs
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  }

  private output(entry: LogEntry): void {
    const { level, message, data, error } = entry;
    
    const consoleMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[level];

    if (error) {
      consoleMethod(message, error, data || '');
    } else if (data) {
      consoleMethod(message, data);
    } else {
      consoleMethod(message);
    }

    // Store in localStorage for debugging
    if (level !== 'debug') {
      this.storeLog(entry);
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.output(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: Error, data?: any): void {
    if (this.shouldLog('error')) {
      const entry = this.formatMessage('error', message, data);
      entry.error = error;
      this.output(entry);
    }
  }

  /**
   * Create a child logger with a sub-context
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.logLevel);
  }

  /**
   * Get all stored logs
   */
  static getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('pos_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all stored logs
   */
  static clearLogs(): void {
    localStorage.removeItem('pos_logs');
  }

  /**
   * Export logs for support/debugging
   */
  static exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Create default application logger
export const appLogger = new Logger('POS', 'info');

// Create specialized loggers for different modules
export const loggers = {
  auth: new Logger('Auth', 'info'),
  orders: new Logger('Orders', 'info'),
  sync: new Logger('Sync', 'info'),
  inventory: new Logger('Inventory', 'info'),
  api: new Logger('API', 'warn'),
  ws: new Logger('WebSocket', 'info'),
  hardware: new Logger('Hardware', 'info'),
  payment: new Logger('Payment', 'info'),
};

export default Logger;
