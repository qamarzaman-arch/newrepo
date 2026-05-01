import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { validatePagination, createPaginationResponse } from '../utils/pagination';

const router = Router();

// Validation schemas
const createInventoryItemSchema = z.object({
  menuItemId: z.string().uuid().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1),
  // QA A28: stock and price values must be non-negative.
  currentStock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  costPerUnit: z.number().min(0),
  sellingPrice: z.number().min(0).optional(),
  supplierId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
});

const updateInventoryItemSchema = z.object({
  menuItemId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1).optional(),
  minStock: z.number().optional(),
  maxStock: z.number().optional(),
  costPerUnit: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  supplierId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

const stockMovementSchema = z.object({
  type: z.enum(['PURCHASE', 'SALE', 'WASTE', 'RETURN', 'TRANSFER']),
  // QA A28: quantity must be a positive magnitude. Direction is encoded by `type`.
  quantity: z.number().positive(),
  reference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

const stockAdjustmentSchema = z.object({
  adjustmentType: z.enum(['ADD', 'REMOVE', 'CORRECTION']),
  quantity: z.number().positive(),
  reason: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
});

// Get all inventory items with filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, status, warehouseId, lowStock, page, limit } = req.query;
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : undefined;

    // Validate pagination
    const pagination = validatePagination(page || 1, limit || 50);

    const where: any = { isActive: true };

    if (category) where.category = category;
    if (warehouseId) where.warehouseId = warehouseId;
    if (rawSearch) {
      where.OR = [
        { name: { contains: rawSearch, mode: 'insensitive' } },
        { sku: { contains: rawSearch, mode: 'insensitive' } },
        { barcode: { contains: rawSearch, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (lowStock === 'true') {
      where.status = { in: ['LOW_STOCK', 'OUT_OF_STOCK'] };
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          menuItem: true,
          supplier: true,
          warehouse: true,
        },
        orderBy: { name: 'asc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: { 
        items,
        pagination: createPaginationResponse(total, pagination.page, pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Inventory stats summary (total items, value, low-stock count, out-of-stock count)
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalItems, lowStockCount, outOfStockCount, valuationResult] = await Promise.all([
      prisma.inventoryItem.count({ where: { isActive: true } }),
      prisma.inventoryItem.count({ where: { isActive: true, status: 'LOW_STOCK' } }),
      prisma.inventoryItem.count({ where: { isActive: true, status: 'OUT_OF_STOCK' } }),
      prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { currentStock: true, costPerUnit: true },
      }),
    ]);

    // QA A30: sum stock value via Number() to avoid mixed Decimal/number arithmetic.
    const totalValue = valuationResult.reduce(
      (sum, item) => sum + Number(item.currentStock) * Number(item.costPerUnit), 0
    );

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockCount,
        outOfStockCount,
        totalValue,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get low stock items
router.get('/low-stock', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        OR: [
          { status: 'LOW_STOCK' },
          { status: 'OUT_OF_STOCK' },
        ],
      },
      include: {
        supplier: true,
        warehouse: true,
      },
      orderBy: { currentStock: 'asc' },
    });

    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
});

// Get stock movements
router.get('/movements', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { itemId, type, startDate, endDate, page, limit } = req.query;

    // Validate pagination
    const pagination = validatePagination(page || 1, limit || 50);

    const where: any = {};

    if (itemId) where.inventoryItemId = itemId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          inventoryItem: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        movements,
        pagination: createPaginationResponse(total, pagination.page, pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get stock valuation report
router.get('/reports/valuation', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        currentStock: true,
        costPerUnit: true,
        status: true,
      },
    });

    const totalValue = items.reduce((sum, item) => {
      return sum + Number(item.currentStock) * Number(item.costPerUnit);
    }, 0);

    const byCategory = items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 };
      }
      acc[category].count++;
      acc[category].value += Number(item.currentStock) * Number(item.costPerUnit);
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    res.json({
      success: true,
      data: {
        items,
        summary: {
          totalItems: items.length,
          totalValue,
          byCategory,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single inventory item
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: {
        menuItem: true,
        supplier: true,
        warehouse: true,
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        adjustments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// Create inventory item
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createInventoryItemSchema.parse(req.body);

    // Auto-generate SKU if not provided
    const sku = validatedData.sku || `INV-${Date.now()}`;

    // Determine initial status
    let status = 'IN_STOCK';
    if (validatedData.currentStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (validatedData.currentStock <= validatedData.minStock) {
      status = 'LOW_STOCK';
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name: validatedData.name,
        sku,
        barcode: validatedData.barcode,
        category: validatedData.category,
        unit: validatedData.unit,
        currentStock: validatedData.currentStock,
        minStock: validatedData.minStock,
        maxStock: validatedData.maxStock,
        costPerUnit: validatedData.costPerUnit,
        sellingPrice: validatedData.sellingPrice,
        status,
        menuItemId: validatedData.menuItemId,
        supplierId: validatedData.supplierId,
        warehouseId: validatedData.warehouseId,
      },
      include: {
        menuItem: true,
        supplier: true,
        warehouse: true,
      },
    });

    logger.info(`Inventory item created: ${sanitize(item.name)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// Update inventory item
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateInventoryItemSchema.parse(req.body);

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data,
      include: {
        menuItem: true,
        supplier: true,
        warehouse: true,
      },
    });

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// Record stock movement
router.post('/:id/movement', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = stockMovementSchema.parse(req.body);

    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    // QA A10 / A28: do the stock change with a conditional updateMany so that
    // two concurrent SALEs cannot both pass an in-memory check and oversell.
    // For decrements we require `currentStock >= quantity`; for increments any
    // current value is fine.
    const isDecrement = data.type === 'SALE' || data.type === 'WASTE' || data.type === 'TRANSFER';
    const previousStock = Number(item.currentStock);

    const movement = await prisma.$transaction(async (tx) => {
      let updateResult;
      if (isDecrement) {
        updateResult = await tx.inventoryItem.updateMany({
          where: {
            id: req.params.id,
            currentStock: { gte: data.quantity },
          },
          data: {
            currentStock: { decrement: data.quantity },
          },
        });
      } else {
        updateResult = await tx.inventoryItem.updateMany({
          where: { id: req.params.id },
          data: {
            currentStock: { increment: data.quantity },
          },
        });
      }

      if (updateResult.count !== 1) {
        // Either the row vanished, or the conditional decrement failed because
        // someone else took the stock first. Hard-fail so the caller retries
        // with fresh data instead of silently selling stock that isn't there.
        throw new AppError('Insufficient stock for this movement', 409);
      }

      // Re-read to compute status from the post-mutation truth (avoids the
      // status drifting if two concurrent updates landed at once).
      const fresh = await tx.inventoryItem.findUnique({
        where: { id: req.params.id },
        select: { currentStock: true, minStock: true },
      });
      const liveStock = Number(fresh?.currentStock ?? 0);
      const liveMin = Number(fresh?.minStock ?? 0);
      const status =
        liveStock <= 0 ? 'OUT_OF_STOCK'
        : liveStock <= liveMin ? 'LOW_STOCK'
        : 'IN_STOCK';

      await tx.inventoryItem.update({
        where: { id: req.params.id },
        data: { status },
      });

      const newMovement = await tx.stockMovement.create({
        data: {
          inventoryItemId: req.params.id,
          type: data.type,
          quantity: data.quantity,
          previousStock,
          newStock: liveStock,
          reference: data.reference,
          notes: data.notes,
          performedById: req.user!.userId,
        },
      });

      return newMovement;
    });

    logger.info(`Stock movement recorded for ${sanitize(item.name)}: ${data.type} ${data.quantity} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { movement },
    });
  } catch (error) {
    next(error);
  }
});

// Record stock adjustment
router.post('/:id/adjustment', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = stockAdjustmentSchema.parse(req.body);

    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      throw new AppError('Inventory item not found', 404);
    }

    // QA A10 / A28: same atomic-conditional pattern as the movement endpoint.
    const isDecrement = data.adjustmentType === 'REMOVE' || data.adjustmentType === 'CORRECTION';
    const previousStock = Number(item.currentStock);

    const adjustment = await prisma.$transaction(async (tx) => {
      let updateResult;
      if (isDecrement) {
        updateResult = await tx.inventoryItem.updateMany({
          where: {
            id: req.params.id,
            currentStock: { gte: data.quantity },
          },
          data: { currentStock: { decrement: data.quantity } },
        });
      } else {
        updateResult = await tx.inventoryItem.updateMany({
          where: { id: req.params.id },
          data: { currentStock: { increment: data.quantity } },
        });
      }

      if (updateResult.count !== 1) {
        throw new AppError('Adjustment would result in negative stock or item not found', 409);
      }

      const fresh = await tx.inventoryItem.findUnique({
        where: { id: req.params.id },
        select: { currentStock: true, minStock: true },
      });
      const liveStock = Number(fresh?.currentStock ?? 0);
      const liveMin = Number(fresh?.minStock ?? 0);
      const status =
        liveStock <= 0 ? 'OUT_OF_STOCK'
        : liveStock <= liveMin ? 'LOW_STOCK'
        : 'IN_STOCK';

      await tx.inventoryItem.update({
        where: { id: req.params.id },
        data: { status },
      });

      const newAdjustment = await tx.stockAdjustment.create({
        data: {
          inventoryItemId: req.params.id,
          adjustmentType: data.adjustmentType,
          quantity: data.quantity,
          reason: data.reason,
          notes: data.notes,
          adjustedById: req.user!.userId,
        },
      });

      return newAdjustment;
    });

    logger.info(`Stock adjustment for ${sanitize(item.name)}: ${data.adjustmentType} ${data.quantity} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { adjustment },
    });
  } catch (error) {
    next(error);
  }
});

// Delete inventory item (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Inventory item deactivated',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
