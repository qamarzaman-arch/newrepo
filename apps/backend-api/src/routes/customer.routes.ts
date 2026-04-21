import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

const router = Router();

// Validation schemas
const createCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10),
  address: z.string().optional(),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.string().optional(),
});

const updateCustomerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.string().optional(),
  isActive: z.boolean().optional(),
});

const loyaltyTransactionSchema = z.object({
  points: z.number(),
  reason: z.string().min(1),
  referenceId: z.string().optional(),
});

// Get all customers with filters and pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, page = 1, limit = 50, minLoyaltyPoints } = req.query;

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (minLoyaltyPoints) {
      where.loyaltyPoints = { gte: Number(minLoyaltyPoints) };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        customers,
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

// Search customers
router.get('/search', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        data: { customers: [] },
      });
    }

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { totalSpent: 'desc' },
    });

    res.json({
      success: true,
      data: { customers },
    });
  } catch (error) {
    next(error);
  }
});

// Get single customer with order history
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          take: 10,
          orderBy: { orderedAt: 'desc' },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
          },
        },
        loyaltyTransactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

// Get customer order history
router.get('/:id/orders', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const { page = 1, limit = 50 } = req.query;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: req.params.id },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
          payments: true,
        },
        orderBy: { orderedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where: { customerId: req.params.id } }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
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

// Create customer
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);

    // Check for duplicate phone or email
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: validatedData.phone },
          ...(validatedData.email ? [{ email: validatedData.email }] : []),
        ],
      },
    });

    if (existing) {
      throw new AppError('Customer with this phone or email already exists', 409);
    }

    const customer = await prisma.customer.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        email: validatedData.email,
        address: validatedData.address,
        city: validatedData.city,
        dateOfBirth: validatedData.dateOfBirth,
        gender: validatedData.gender,
        notes: validatedData.notes,
        preferences: validatedData.preferences,
      },
    });

    logger.info(`Customer created: ${sanitize(customer.firstName)} ${sanitize(customer.lastName)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

// Update customer
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateCustomerSchema.parse(req.body);

    // Check for duplicates if phone or email is being updated
    if (data.phone || data.email) {
      const existing = await prisma.customer.findFirst({
        where: {
          id: { not: req.params.id },
          OR: [
            ...(data.phone ? [{ phone: data.phone }] : []),
            ...(data.email ? [{ email: data.email }] : []),
          ],
        },
      });

      if (existing) {
        throw new AppError('Customer with this phone or email already exists', 409);
      }
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

// Delete customer (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Customer deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// Add/deduct loyalty points
router.post('/:id/loyalty', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = loyaltyTransactionSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const newBalance = customer.loyaltyPoints + data.points;

    if (newBalance < 0) {
      throw new AppError('Insufficient loyalty points', 400);
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Create loyalty transaction
      const loyaltyTx = await tx.loyaltyTransaction.create({
        data: {
          customerId: req.params.id,
          points: data.points,
          reason: data.reason,
          referenceId: data.referenceId,
          balanceAfter: newBalance,
        },
      });

      // Update customer loyalty points
      const updatedCustomer = await tx.customer.update({
        where: { id: req.params.id },
        data: {
          loyaltyPoints: newBalance,
        },
      });

      return { transaction: loyaltyTx, customer: updatedCustomer };
    });

    logger.info(`Loyalty points updated for customer ${sanitize(req.params.id)}: ${data.points} points by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
