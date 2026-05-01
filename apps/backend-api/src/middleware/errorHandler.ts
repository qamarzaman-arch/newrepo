import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

interface PrismaError extends Error {
  code?: string;
  meta?: {
    target?: string[];
  };
}

export function errorHandler(
  err: Error | AppError | ZodError | PrismaError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // AppError handling
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    message = err.message || 'Internal Server Error';
  }

  // QA A86: Prisma error details can leak internals via 500. Only surface
  // a generic message in production; full Prisma error stays in the log.
  const pErr = err as PrismaError;
  if (pErr.code === 'P2002') {
    statusCode = 409;
    message = `Duplicate field value: ${pErr.meta?.target}`;
  }
  if (pErr.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }
  if (pErr.code && pErr.code.startsWith('P') && statusCode === 500) {
    message = process.env.NODE_ENV === 'production'
      ? 'A database error occurred. Please retry.'
      : `[${pErr.code}] ${pErr.message}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors (Zod)
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed: ' + err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
  }

  // Expected operational 4xx errors are warnings, not errors. Reserve error level for 5xx/unexpected.
  const isExpected4xx = statusCode >= 400 && statusCode < 500;
  if (isExpected4xx) {
    logger.warn(`[${statusCode}] ${req.method} ${req.path}: ${message}`);
  } else {
    logger.error(`Error [${statusCode}]: ${message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // QA A53: gate stack-trace exposure on its own flag. Previously any non-prod
  // env (including staging) leaked stacks, which is wrong if staging mirrors prod.
  const exposeStack = process.env.EXPOSE_STACK === 'true';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err instanceof ZodError && { issues: err.issues }),
      ...((req as any).requestId && { requestId: (req as any).requestId }),
      ...(exposeStack && { stack: err.stack }),
    },
  });
}
