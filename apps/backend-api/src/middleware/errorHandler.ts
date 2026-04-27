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

  // Prisma validation errors
  if ((err as PrismaError).code === 'P2002') {
    statusCode = 409;
    message = `Duplicate field value: ${(err as PrismaError).meta?.target}`;
  }

  // Prisma record not found
  if ((err as PrismaError).code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
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

  logger.error(`Error [${statusCode}]: ${message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err instanceof ZodError && { issues: err.issues }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
