import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { verifyAndUpgradeSecret } from '../utils/pinSecurity';

const router = Router();

// Get modification history for an order
router.get('/order/:orderId', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const modifications = await prisma.orderModificationHistory.findMany({
      where: { orderId },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { modifiedAt: 'desc' },
      include: {
        modifiedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    const total = await prisma.orderModificationHistory.count({
      where: { orderId },
    });

    res.json({
      success: true,
      data: { modifications, total },
    });
  } catch (error) {
    next(error);
  }
});

// Get all modifications with filtering
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId, modifiedBy, fieldName, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (orderId) where.orderId = orderId as string;
    if (modifiedBy) where.modifiedById = modifiedBy as string;
    if (fieldName) where.fieldName = fieldName as string;

    const modifications = await prisma.orderModificationHistory.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { modifiedAt: 'desc' },
      include: {
        modifiedBy: { select: { id: true, fullName: true, username: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    const total = await prisma.orderModificationHistory.count({ where });

    res.json({
      success: true,
      data: { modifications, total },
    });
  } catch (error) {
    next(error);
  }
});

// Create modification log (internal use)
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId, fieldName, oldValue, newValue, reason } = req.body;

    const modification = await prisma.orderModificationHistory.create({
      data: {
        orderId,
        fieldName,
        oldValue,
        newValue,
        reason,
        modifiedById: req.user!.userId,
        modifiedAt: new Date(),
      },
      include: {
        modifiedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    logger.info(`Order ${sanitize(orderId)} modified: ${sanitize(fieldName)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { modification },
    });
  } catch (error) {
    next(error);
  }
});

// Rollback a modification (manager only)
router.post('/:id/rollback', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { managerPin } = req.body;

    // Verify manager PIN
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { pin: true, role: true },
    });

    if (!user || user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new AppError('Only managers can rollback modifications', 403);
    }

    const pinMatch = await verifyAndUpgradeSecret(managerPin, user.pin, async (hashedPin) => {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { pin: hashedPin },
      });
    });
    if (!pinMatch) {
      throw new AppError('Invalid manager PIN', 401);
    }

    // Get the modification
    const modification = await prisma.orderModificationHistory.findUnique({
      where: { id },
    });

    if (!modification) {
      throw new AppError('Modification not found', 404);
    }

    // Rollback the change
    await prisma.order.update({
      where: { id: modification.orderId },
      data: {
        [modification.fieldName]: modification.oldValue,
      },
    });

    // Log the rollback
    await prisma.orderModificationHistory.create({
      data: {
        orderId: modification.orderId,
        fieldName: modification.fieldName,
        oldValue: modification.newValue,
        newValue: modification.oldValue,
        reason: `Rollback of modification ${id}`,
        modifiedById: req.user!.userId,
        modifiedAt: new Date(),
      },
    });

    logger.info(`Order modification ${sanitize(id)} rolled back by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      message: 'Modification rolled back successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
