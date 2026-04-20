import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Check session in database
    const session = await prisma.session.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      throw new AppError('Invalid or expired token', 401);
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.deleteMany({ where: { token } });
      throw new AppError('Token expired', 401);
    }

    if (!session.user.isActive) {
      throw new AppError('User account is disabled', 403);
    }

    // Verify JWT
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
}
