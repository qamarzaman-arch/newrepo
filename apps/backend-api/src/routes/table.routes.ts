import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

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
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    await AuditLogService.log(req.user!.userId, 'CREATE', 'Table', table.id);

    res.status(201).json({
      success: true,
      data: { table },
    });
  } catch (error) {
    next(error);
  }
});

// Update table
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    await AuditLogService.log(req.user!.userId, 'UPDATE', 'Table', table.id, data);

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
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateStatusSchema.parse(req.body);

    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    // Validate status transitions
    if (table.status === 'OCCUPIED' && data.status !== 'NEEDS_CLEANING') {
      throw new AppError('Occupied table must be set to NEEDS_CLEANING first', 400);
    }

    const updatedTable = await prisma.table.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        ...(data.status === 'AVAILABLE' && { currentOrderId: null }),
      },
    });

    res.json({
      success: true,
      data: { table: updatedTable },
    });
  } catch (error) {
    next(error);
  }
});

// Delete table (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const table = await prisma.table.findUnique({
      where: { id: req.params.id },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    if (table.status === 'OCCUPIED') {
      throw new AppError('Cannot delete occupied table', 400);
    }

    await prisma.table.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Table deactivated',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
