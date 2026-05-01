import winston from 'winston';

// QA D46: stronger filter for log injection. Strip newlines, ANSI escape
// sequences, and JSON-breaking control chars. Quotes are *not* stripped
// because we still want them to be visible in audit text — Winston JSON
// transport escapes them safely.
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;
const CTRL_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export const sanitize = (input: unknown): string => {
  if (input === null || input === undefined) return '';
  const s = typeof input === 'string' ? input : String(input);
  return s
    .replace(ANSI_REGEX, '')
    .replace(/[\r\n]/g, ' ')
    .replace(CTRL_REGEX, '')
    .trim()
    .slice(0, 2000);
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// QA D45: prefer daily-rotate when the package is installed; fall back to
// fixed-size files so the logger still works in environments that haven't
// yet installed the optional dependency.
function buildTransports(): winston.transport[] {
  try {
    // Lazy require so a missing optional dep never crashes startup.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DailyRotate = require('winston-daily-rotate-file');
    return [
      new DailyRotate({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
      }),
      new DailyRotate({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
      }),
    ];
  } catch {
    return [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5_242_880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5_242_880,
        maxFiles: 5,
      }),
    ];
  }
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: buildTransports(),
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}
