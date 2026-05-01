import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { prisma } from './config/database';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { initializeWebSocketManager } from './utils/websocket';
import { initSessionCleanupJob, initAuditLogCleanupJob, initTableLockCleanupJob, initQrSessionCleanupJob } from './jobs/sessionCleanup';
import { validateAndExitIfInvalid } from './config/configValidator';
import { JwtPayload, JWT_VERIFY_OPTIONS } from './middleware/auth';
import { csrfProtection, issueCsrfToken } from './middleware/csrfProtection';
import { requestId } from './middleware/requestId';
import { ensureChartOfAccountsSeeded } from './services/accounting.service';

dotenv.config();

// Validate configuration BEFORE starting server
validateAndExitIfInvalid();

interface SocketWithUser extends Socket {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in apps/backend-api/.env');
}

const app: Application = express();
const server = http.createServer(app);

// Socket.IO CORS configuration
const socketCorsOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ['http://localhost:5173'];
const io = new SocketIOServer(server, {
  cors: {
    origin: socketCorsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Make io available globally for WebSocketManager
declare global {
  var socketIO: SocketIOServer;
}

global.socketIO = io;

// Initialize WebSocketManager BEFORE routes so it's available when routes call getWebSocketManager()
initializeWebSocketManager(io);

// QA A54: trust proxy chain length must be explicit so req.ip is not the LB IP.
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(tp) ? Number(tp) : tp);
}

// QA D56: request-id first so all subsequent middleware can correlate.
app.use(requestId);

// QA A51: keep CSP enabled with a permissive policy instead of disabling it
// outright. Electron clients use file:// origins; allow them via 'self' + data:
// while still mitigating XSS for any HTML the API serves.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", ...((process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean))],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — QA A50: in production, refuse "no origin" requests unless they
// carry an Authorization header (genuine server-to-server / Electron callers
// always do). Browsers always send Origin, so this only blocks anonymous
// curl/scrapers from making state-changing calls.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (corsOrigins.length === 0 || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key', 'Stripe-Signature'],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 204,
}));

// QA A50 (browserless caller hardening) + A8 (HTTPS enforcement).
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && process.env.FORCE_HTTPS === 'true') {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    if (proto !== 'https' && req.path !== '/health') {
      return res.status(403).json({
        success: false,
        error: { message: 'HTTPS required', code: 'HTTPS_REQUIRED' },
      });
    }
  }

  if (isProd && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers['origin'];
    const auth = req.headers['authorization'];
    const stripeSig = req.headers['stripe-signature'];
    if (!origin && !auth && !stripeSig) {
      return res.status(401).json({
        success: false,
        error: { message: 'Anonymous browserless write blocked. Provide Authorization header.', code: 'ANON_WRITE_BLOCKED' },
      });
    }
  }

  next();
});

app.use(compression());
app.use(issueCsrfToken);
app.use(csrfProtection);

// Stripe webhook needs the unparsed request body for signature verification.
// This must be registered BEFORE express.json() so the body stays as a Buffer.
app.use('/api/v1/payments/webhooks/stripe', express.raw({ type: 'application/json' }));

// QA A84: tighten body limit. POS payloads are tiny; 1 MB is more than enough.
// Endpoints that need bigger uploads can mount their own per-route parser.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// QA A75: reject non-JSON bodies on state-changing requests with a clear 415
// instead of failing deep inside a route with a confusing parse error.
app.use((req, res, next) => {
  const stateChanging = ['POST', 'PUT', 'PATCH'].includes(req.method);
  if (!stateChanging) return next();
  if (req.path.startsWith('/api/v1/payments/webhooks/')) return next();
  if (!req.headers['content-length'] || req.headers['content-length'] === '0') return next();
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('application/json') && !ct.includes('multipart/form-data') && !ct.includes('application/x-www-form-urlencoded')) {
    return res.status(415).json({
      success: false,
      error: { message: 'Unsupported Media Type — use application/json', code: 'UNSUPPORTED_MEDIA_TYPE' },
    });
  }
  next();
});

// General rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints (brute force protection)
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 5),
  skipSuccessfulRequests: false,
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const username = req.body?.username || 'anonymous';
    return `${ip}:${username}`;
  },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/validate-pin', authLimiter);

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'OK',
      healthy: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'connected',
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'UNHEALTHY',
      healthy: false,
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

// API Routes
setupRoutes(app);

// Error handling middleware — errorHandler decides log level based on status code
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      JWT_VERIFY_OPTIONS,
    ) as JwtPayload;

    // Attach user info to socket for use in handlers
    (socket as SocketWithUser).user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.warn('Socket.IO auth failed:', (error as Error).message);
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket: SocketWithUser) => {
  const user = socket.user;
  logger.info(`Client connected: ${socket.id} (User: ${user?.username}, Role: ${user?.role})`);

  // Auto-join role-based rooms
  if (user?.role) {
    socket.join(user.role.toLowerCase());
  }

  // Join rooms for real-time updates — enforce role-based access
  socket.on('join-room', (room: string) => {
    const role = user?.role?.toUpperCase() || '';
    const adminOnlyRooms = new Set(['admin', 'analytics', 'reports', 'manager']);
    const kitchenRooms = new Set(['kitchen', 'kot']);
    const cashierRooms = new Set(['orders', 'cashier', 'payments']);

    const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';
    const isKitchen = role === 'KITCHEN';
    const isCashier = role === 'CASHIER';

    if (adminOnlyRooms.has(room) && !isAdminOrManager) {
      logger.warn(`Socket ${socket.id} (role: ${role}) denied access to room: ${room}`);
      socket.emit('room-access-denied', { room, reason: 'Insufficient role' });
      return;
    }

    if (kitchenRooms.has(room) && !isKitchen && !isAdminOrManager) {
      logger.warn(`Socket ${socket.id} (role: ${role}) denied access to room: ${room}`);
      socket.emit('room-access-denied', { room, reason: 'Insufficient role' });
      return;
    }

    if (cashierRooms.has(room) && !isCashier && !isAdminOrManager) {
      logger.warn(`Socket ${socket.id} (role: ${role}) denied access to room: ${room}`);
      socket.emit('room-access-denied', { room, reason: 'Insufficient role' });
      return;
    }

    socket.join(room);
    logger.info(`Client ${socket.id} joined room: ${room}`);
  });

  // Leave room
  socket.on('leave-room', (room: string) => {
    socket.leave(room);
    logger.info(`Client ${socket.id} left room: ${room}`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize cron jobs
  initSessionCleanupJob();
  initAuditLogCleanupJob();
  initTableLockCleanupJob();
  initQrSessionCleanupJob();

  // Ensure chart of accounts seeded
  ensureChartOfAccountsSeeded().catch((err) => logger.error('Chart seed failed:', err));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { app, io };
