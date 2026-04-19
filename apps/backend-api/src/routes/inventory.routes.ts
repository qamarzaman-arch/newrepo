import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

// Validation schemas
const createInventoryItemSchema = z.object({
  menuItemId: z.string().uuid().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1),
  currentStock: z.number().default(0),
  minStock: z.number().default(0),
  maxStock: z.number().optional(),
  costPerUnit: z.number().positive(),
  sellingPrice: z.number().positive().optional(),
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
  quantity: z.number(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const stockAdjustmentSchema = z.object({
  adjustmentType: z.enum(['ADD', 'REMOVE', 'CORRECTION']),
  quantity: z.number(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

// Get all inventory items with filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, status, warehouseId, lowStock } = req.query;

    const where: any = { isActive: true };

    if (category) where.category = category;
    if (warehouseId) where.warehouseId = warehouseId;

    if (status) {
      where.status = status;
    }

    if (lowStock === 'true') {
      where.currentStock = { lt: prisma.inventoryItem.fields.minStock as any };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        menuItem: true,
        supplier: true,
        warehouse: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: { items },
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
    const { itemId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

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
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        movements,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
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
      return sum + (item.currentStock * item.costPerUnit);
    }, 0);

    const byCategory = items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 };
      }
      acc[category].count++;
      acc[category].value += item.currentStock * item.costPerUnit;
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
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const previousStock = item.currentStock;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    switch (data.type) {
      case 'PURCHASE':
      case 'RETURN':
        newStock = previousStock + data.quantity;
        break;
      case 'SALE':
      case 'WASTE':
      case 'TRANSFER':
        newStock = previousStock - data.quantity;
        if (newStock < 0) {
          throw new AppError('Insufficient stock', 400);
        }
        break;
    }

    // Determine new status
    let status = 'IN_STOCK';
    if (newStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (newStock <= item.minStock) {
      status = 'LOW_STOCK';
    }

    const movement = await prisma.$transaction(async (tx) => {
      // Create movement record
      const newMovement = await tx.stockMovement.create({
        data: {
          inventoryItemId: req.params.id,
          type: data.type,
          quantity: data.quantity,
          previousStock,
          newStock,
          reference: data.reference,
          notes: data.notes,
          performedById: req.user!.userId,
        },
      });

      // Update inventory item
      await tx.inventoryItem.update({
        where: { id: req.params.id },
        data: {
          currentStock: newStock,
          status,
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

    const previousStock = item.currentStock;
    let newStock = previousStock;

    switch (data.adjustmentType) {
      case 'ADD':
        newStock = previousStock + data.quantity;
        break;
      case 'REMOVE':
      case 'CORRECTION':
        newStock = previousStock - data.quantity;
        if (newStock < 0) {
          throw new AppError('Adjustment would result in negative stock', 400);
        }
        break;
    }

    // Determine new status
    let status = 'IN_STOCK';
    if (newStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (newStock <= item.minStock) {
      status = 'LOW_STOCK';
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      // Create adjustment record
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

      // Update inventory item
      await tx.inventoryItem.update({
        where: { id: req.params.id },
        data: {
          currentStock: newStock,
          status,
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
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
