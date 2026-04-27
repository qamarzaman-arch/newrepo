import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get sync queue
router.get('/queue', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const operations = await prisma.syncQueue.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    res.json({ success: true, data: { operations } });
  } catch (error) {
    next(error);
  }
});

// Add to sync queue
router.post('/queue', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { operation, modelName, recordId, payload } = req.body;
    const op = await prisma.syncQueue.create({
      data: { operation, modelName, recordId, payload: JSON.stringify(payload) },
    });
    res.status(201).json({ success: true, data: { operation: op } });
  } catch (error) {
    next(error);
  }
});

// Update sync status
router.patch('/queue/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, errorMessage } = req.body;
    const op = await prisma.syncQueue.update({
      where: { id: req.params.id },
      data: {
        status,
        errorMessage,
        syncedAt: status === 'completed' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: { operation: op } });
  } catch (error) {
    next(error);
  }
});

// Get sync logs
router.get('/logs', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.syncLog.count(),
    ]);

    res.json({
      success: true,
      data: { logs, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } },
    });
  } catch (error) {
    next(error);
  }
});

// Process pending sync
router.post('/process', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pending = await prisma.syncQueue.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const processed = [];
    for (const op of pending) {
      try {
        const payloadObj = typeof op.payload === 'string' ? JSON.parse(op.payload) : op.payload;
        const modelNameMap: Record<string, string> = {
          'Order': 'order',
          'OrderItem': 'orderItem',
          'Payment': 'payment',
          'Customer': 'customer',
          'CashDrawer': 'cashDrawer'
        };
        const safeModelName = modelNameMap[op.modelName] || op.modelName.charAt(0).toLowerCase() + op.modelName.slice(1);
        const modelDelegate = (prisma as any)[safeModelName];

        if (!modelDelegate) throw new Error(`Unknown model ${op.modelName}`);

        // Strip unsupported relational nested arrays if needed, basic implementation handles flat tables primarily
        if (op.operation === 'CREATE') {
          // Check if exists
          const existing = await modelDelegate.findUnique({ where: { id: op.recordId } });
          if (!existing) {
             await modelDelegate.create({ data: payloadObj });
          } else {
             await modelDelegate.update({ where: { id: op.recordId }, data: payloadObj });
          }
        } else if (op.operation === 'UPDATE') {
          await modelDelegate.update({ where: { id: op.recordId }, data: payloadObj });
        } else if (op.operation === 'DELETE') {
          await modelDelegate.delete({ where: { id: op.recordId } }).catch((_e: any) => {});
        }

        await prisma.syncQueue.update({
          where: { id: op.id },
          data: { status: 'completed', syncedAt: new Date() },
        });

        await prisma.syncLog.create({
          data: {
            action: op.operation,
            direction: 'upload',
            recordsSynced: 1,
            status: 'success',
            details: `Processed ${op.modelName}:${op.recordId}`,
          },
        });

        processed.push(op.id);
      } catch (error) {
        await prisma.syncQueue.update({
          where: { id: op.id },
          data: {
            status: 'failed',
            retryCount: { increment: 1 },
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    res.json({ success: true, data: { processed: processed.length, failed: pending.length - processed.length } });
  } catch (error) {
    next(error);
  }
});

export default router;
