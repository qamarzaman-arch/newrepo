import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getWebSocketManager } from '../utils/websocket';

const router = Router();
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Acquire table lock
router.post('/lock', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.body;
    const userId = req.user!.userId;

    if (!tableId) {
      throw new AppError('Table ID is required', 400);
    }

    // Use database transaction for atomic lock acquisition
    const result = await prisma.$transaction(async (tx) => {
      // Check for existing lock
      const existingLock = await (tx as any).tableLock.findUnique({
        where: { tableId },
      });

      const now = new Date();

      if (existingLock) {
        // Check if lock is expired
        if (new Date(existingLock.expiresAt) < now) {
          // Lock expired, delete it
          await (tx as any).tableLock.delete({
            where: { tableId },
          });
        } else if (existingLock.userId !== userId) {
          // Table is locked by another user
          const lockedBy = await tx.user.findUnique({
            where: { id: existingLock.userId },
            select: { fullName: true, username: true },
          });
          return {
            success: false,
            locked: true,
            lockedBy: lockedBy?.fullName || lockedBy?.username || 'Another user',
            expiresAt: existingLock.expiresAt,
          };
        } else {
          // Already locked by this user, extend the lock
          const newExpiresAt = new Date(Date.now() + LOCK_DURATION_MS);
          await (tx as any).tableLock.update({
            where: { tableId },
            data: { expiresAt: newExpiresAt },
          });
          return {
            success: true,
            locked: false,
            message: 'Lock extended',
            expiresAt: newExpiresAt,
          };
        }
      }

      // Create new lock
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);
      await (tx as any).tableLock.create({
        data: {
          tableId,
          userId,
          expiresAt,
        },
      });

      return {
        success: true,
        locked: false,
        expiresAt,
      };
    }, {
      isolationLevel: 'Serializable',
    });

    // Broadcast lock update via WebSocket
    if (result.success) {
      const ws = getWebSocketManager();
      ws.broadcast('table:locked', {
        tableId,
        lockedBy: req.user!.userId,
        lockedByName: req.user!.username,
        expiresAt: result.expiresAt,
      });
    }

    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Release table lock
router.post('/unlock', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.body;
    const userId = req.user!.userId;

    if (!tableId) {
      throw new AppError('Table ID is required', 400);
    }

    const lock = await (prisma as any).tableLock.findUnique({
      where: { tableId },
    });

    if (!lock) {
      return res.json({
        success: true,
        data: { message: 'Table was not locked' },
      });
    }

    // Only allow unlock if locked by same user or admin/manager
    if (lock.userId !== userId && !['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      throw new AppError('Cannot unlock table locked by another user', 403);
    }

    await (prisma as any).tableLock.delete({
      where: { tableId },
    });

    // Broadcast unlock via WebSocket
    const ws = getWebSocketManager();
    ws.broadcast('table:unlocked', {
      tableId,
      unlockedBy: req.user!.userId,
    });

    res.json({
      success: true,
      data: { message: 'Table unlocked successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// Check lock status
router.get('/:tableId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.params;

    const lock = await (prisma as any).tableLock.findUnique({
      where: { tableId },
      include: {
        user: {
          select: { fullName: true, username: true },
        },
      },
    });

    if (!lock) {
      return res.json({
        success: true,
        data: { locked: false },
      });
    }

    // Check if expired
    if (new Date(lock.expiresAt) < new Date()) {
      await (prisma as any).tableLock.delete({
        where: { tableId },
      });
      return res.json({
        success: true,
        data: { locked: false, wasExpired: true },
      });
    }

    res.json({
      success: true,
      data: {
        locked: true,
        lockedBy: lock.user?.fullName || lock.user?.username,
        userId: lock.userId,
        expiresAt: lock.expiresAt,
        isMyLock: lock.userId === req.user!.userId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Extend lock
router.post('/extend', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.body;
    const userId = req.user!.userId;

    const lock = await (prisma as any).tableLock.findUnique({
      where: { tableId },
    });

    if (!lock) {
      throw new AppError('Table is not locked', 400);
    }

    if (lock.userId !== userId) {
      throw new AppError('Cannot extend lock for table locked by another user', 403);
    }

    const newExpiresAt = new Date(Date.now() + LOCK_DURATION_MS);
    await (prisma as any).tableLock.update({
      where: { tableId },
      data: { expiresAt: newExpiresAt },
    });

    res.json({
      success: true,
      data: { expiresAt: newExpiresAt },
    });
  } catch (error) {
    next(error);
  }
});

// Get all locked tables
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const locks = await (prisma as any).tableLock.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { fullName: true, username: true },
        },
        table: {
          select: { number: true, id: true },
        },
      },
    });

    // Clean up expired locks
    await (prisma as any).tableLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    res.json({
      success: true,
      data: { locks },
    });
  } catch (error) {
    next(error);
  }
});

// Force unlock (admin/manager only)
router.post('/force-unlock', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.body;

    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      throw new AppError('Admin or Manager authorization required', 403);
    }

    const lock = await (prisma as any).tableLock.findUnique({
      where: { tableId },
    });

    if (!lock) {
      return res.json({
        success: true,
        data: { message: 'Table was not locked' },
      });
    }

    await (prisma as any).tableLock.delete({
      where: { tableId },
    });

    // Broadcast unlock
    const ws = getWebSocketManager();
    ws.broadcast('table:unlocked', {
      tableId,
      unlockedBy: req.user!.userId,
      forceUnlocked: true,
    });

    res.json({
      success: true,
      data: { message: 'Table force unlocked successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
