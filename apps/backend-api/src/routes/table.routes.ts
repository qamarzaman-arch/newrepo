import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

// Validation schemas
const createTableSchema = z.object({
  number: z.string().min(1),
  capacity: z.number().positive().default(4),
  location: z.string().optional(),
  shape: z.string().optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const updateTableSchema = z.object({
  number: z.string().min(1).optional(),
  capacity: z.number().positive().optional(),
  location: z.string().optional(),
  shape: z.string().optional(),
  isActive: z.boolean().optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING', 'OUT_OF_ORDER']),
});

const layoutSchema = z.object({
  tables: z.array(z.object({
    id: z.string(),
    posX: z.number(),
    posY: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  })),
});

// Get all tables with filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, location } = req.query;

    const where: any = { isActive: true };

    if (status) where.status = status;
    if (location) where.location = location;

    const tables = await prisma.table.findMany({
      where,
      include: {
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          take: 1,
          orderBy: { orderedAt: 'desc' },
        },
      },
      orderBy: [{ location: 'asc' }, { number: 'asc' }],
    });

    res.json({
      success: true,
      data: { tables },
    });
  } catch (error) {
    next(error);
  }
});

// Get table layout
router.get('/layout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tables = await prisma.table.findMany({
      where: { isActive: true },
      select: {
        id: true,
        number: true,
        capacity: true,
        status: true,
        location: true,
        shape: true,
        posX: true,
        posY: true,
        width: true,
        height: true,
        currentOrderId: true,
      },
      orderBy: [{ location: 'asc' }, { number: 'asc' }],
    });

    res.json({
      success: true,
      data: { tables },
    });
  } catch (error) {
    next(error);
  }
});

// Get single table
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          orderBy: { orderedAt: 'desc' },
          take: 10,
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    res.json({
      success: true,
      data: { table },
    });
  } catch (error) {
    next(error);
  }
});

// Create table
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createTableSchema.parse(req.body);

    // Check for duplicate table number
    const existing = await prisma.table.findFirst({
      where: { number: validatedData.number, isActive: true },
    });

    if (existing) {
      throw new AppError('Table with this number already exists', 409);
    }

    const table = await prisma.table.create({
      data: {
        number: validatedData.number,
        capacity: validatedData.capacity,
        location: validatedData.location,
        shape: validatedData.shape,
        posX: validatedData.posX,
        posY: validatedData.posY,
        width: validatedData.width,
        height: validatedData.height,
      },
    });

    logger.info(`Table created: ${sanitize(table.number)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { table },
    });
  } catch (error) {
    next(error);
  }
});

// Update table
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateTableSchema.parse(req.body);

    // Check for duplicates if number is being updated
    if (data.number) {
      const existing = await prisma.table.findFirst({
        where: {
          number: data.number,
          id: { not: req.params.id },
          isActive: true,
        },
      });

      if (existing) {
        throw new AppError('Table with this number already exists', 409);
      }
    }

    const table = await prisma.table.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: { table },
    });
  } catch (error) {
    next(error);
  }
});

// Update table layout
router.put('/layout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = layoutSchema.parse(req.body);

    await Promise.all(
      data.tables.map((table) =>
        prisma.table.update({
          where: { id: table.id },
          data: {
            posX: table.posX,
            posY: table.posY,
            width: table.width,
            height: table.height,
          },
        })
      )
    );

    res.json({
      success: true,
      message: 'Layout updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update table status
router.patch('/:id/status', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateStatusSchema.parse(req.body);
    const expectedVersion = typeof (req.body as any)?.version === 'number'
      ? (req.body as any).version
      : undefined;

    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    if (data.status === 'AVAILABLE' && table.orders.length > 0) {
      throw new AppError('Cannot mark table as available while there is an active order', 400);
    }

    // QA B23: optimistic lock so two cashiers assigning the same table don't
    // both succeed. We pin to the version the client last saw.
    const v = expectedVersion ?? (table as any).version ?? 0;
    const updateResult = await prisma.table.updateMany({
      where: { id: req.params.id, version: v },
      data: { status: data.status, version: v + 1 },
    });
    if (updateResult.count !== 1) {
      throw new AppError('Table was modified by another user. Refresh and retry.', 409);
    }
    const updatedTable = await prisma.table.findUnique({ where: { id: req.params.id } });

    logger.info(`Table status updated: ${sanitize(table.number)} to ${sanitize(data.status)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { table: updatedTable },
    });
  } catch (error) {
    next(error);
  }
});

// Delete table
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    if (table.orders && table.orders.length > 0) {
      throw new AppError('Cannot delete table with active orders', 400);
    }

    await prisma.table.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    logger.info(`Table deleted: ${sanitize(table.number)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Merge tables
router.post('/merge', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableIds, mergedTableNumber } = req.body;

    if (!tableIds || !Array.isArray(tableIds) || tableIds.length < 2) {
      throw new AppError('At least 2 tables are required to merge', 400);
    }

    // Check if all tables exist and are available
    const tables = await prisma.table.findMany({
      where: {
        id: { in: tableIds },
        isActive: true,
      },
    });

    if (tables.length !== tableIds.length) {
      throw new AppError('One or more tables not found', 404);
    }

    // Check if any tables have active orders
    const tablesWithOrders = await prisma.table.findMany({
      where: {
        id: { in: tableIds },
        orders: {
          some: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        },
      },
    });

    if (tablesWithOrders.length > 0) {
      throw new AppError('Cannot merge tables with active orders', 400);
    }

    // Calculate combined capacity
    const combinedCapacity = tables.reduce((sum, table) => sum + (table.capacity || 0), 0);

    // Create merged table
    const mergedTable = await prisma.table.create({
      data: {
        number: mergedTableNumber || `M-${Date.now()}`,
        capacity: combinedCapacity,
        location: tables[0].location,
        shape: 'rectangular',
        status: 'AVAILABLE',
      },
    });

    // Mark original tables as merged (inactive)
    await prisma.table.updateMany({
      where: { id: { in: tableIds } },
      data: { isActive: false, status: 'MERGED' },
    });

    logger.info(`Tables merged: ${tableIds.join(', ')} into ${sanitize(mergedTable.number)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { mergedTable },
    });
  } catch (error) {
    next(error);
  }
});

// Split merged table
router.post('/split', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableId, splitInto } = req.body;

    if (!splitInto || !Array.isArray(splitInto) || splitInto.length < 2) {
      throw new AppError('Must split into at least 2 tables', 400);
    }

    // Check if table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    // Check if table has active orders
    const tableWithOrder = await prisma.table.findFirst({
      where: {
        id: tableId,
        orders: {
          some: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        },
      },
    });

    if (tableWithOrder) {
      throw new AppError('Cannot split table with active order', 400);
    }

    // Create split tables
    const newTables = await Promise.all(
      splitInto.map((split: any) =>
        prisma.table.create({
          data: {
            number: split.number,
            capacity: split.capacity || Math.floor((table.capacity || 0) / splitInto.length),
            location: table.location,
            shape: table.shape,
            posX: table.posX,
            posY: table.posY,
            status: 'AVAILABLE',
          },
        })
      )
    );

    // Mark original table as inactive
    await prisma.table.update({
      where: { id: tableId },
      data: { isActive: false, status: 'SPLIT' },
    });

    logger.info(`Table split: ${sanitize(table.number)} into ${splitInto.map((s: any) => s.number).join(', ')} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { tables: newTables },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
