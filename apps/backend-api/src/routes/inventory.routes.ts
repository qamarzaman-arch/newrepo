import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

const router = Router();

// Get inventory items
router.get('/', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, lowStock, search } = req.query as any;

    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Handle lowStock filter in-memory if needed or using Prisma logic
    let filteredItems = items;
    if (lowStock === 'true') {
      filteredItems = items.filter(i => i.currentStock <= i.minStock);
    }

    res.json({
      success: true,
      data: { items: filteredItems },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Update stock (deduct)
router.post('/deduct', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items } = z.object({
      items: z.array(z.object({
        id: z.string(),
        quantity: z.number().positive(),
      })),
    }).parse(req.body);

    const updatedItems = await prisma.$transaction(
      items.map((item) =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        })
      )
    );

    await AuditLogService.log(req.user!.userId, 'UPDATE', 'InventoryItem', undefined, { action: 'deduct', items });

    res.json({
      success: true,
      data: { items: updatedItems },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Get low stock alerts
router.get('/low-stock', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        // Simple filter
        currentStock: {
          lte: 10
        }
      },
    });

    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
}) as any);

export default router;
