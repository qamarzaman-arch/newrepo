import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const router = Router();

// Get audit logs with filtering
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      userId, 
      entity, 
      entityId, 
      action,
      limit = '50', 
      offset = '0',
      startDate,
      endDate 
    } = req.query;

    const where: any = {};
    
    if (userId) where.userId = userId as string;
    if (entity) where.entity = entity as string;
    if (entityId) where.entityId = entityId as string;
    if (action) where.action = action as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, username: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { logs, total },
    });
  } catch (error) {
    next(error);
  }
});

// Get single audit log
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await prisma.auditLog.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
      },
    });

    if (!log) {
      throw new AppError('Audit log not found', 404);
    }

    res.json({
      success: true,
      data: { log },
    });
  } catch (error) {
    next(error);
  }
});

// Create audit log (internal use or external)
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action, entity, entityId, changes, ipAddress, userAgent } = req.body;

    const log = await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action,
        entity,
        entityId,
        changes: changes ? JSON.stringify(changes) : undefined,
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.headers['user-agent'],
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    logger.info(`Audit log created: ${action} on ${entity} by ${req.user!.username}`);

    res.status(201).json({
      success: true,
      data: { log },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
