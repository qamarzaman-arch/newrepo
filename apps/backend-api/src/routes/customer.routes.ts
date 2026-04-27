import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize as loggerSanitize } from '../utils/logger';
import { validatePagination, createPaginationResponse } from '../utils/pagination';
import xss from 'xss';

const router = Router();

const LOYALTY_TIERS_SETTING_KEY = 'customer_loyalty_tiers';
const CUSTOMER_SEGMENTS_SETTING_KEY = 'customer_segments';

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

const loyaltyTierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  minPoints: z.number().min(0),
  benefits: z.array(z.string().min(1)).default([]),
  color: z.string().min(1).default('#DC2626'),
  isActive: z.boolean().default(true),
});

const segmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  minSpent: z.number().min(0).default(0),
  minOrders: z.number().int().min(0).default(0),
  minLoyaltyPoints: z.number().int().min(0).default(0),
  color: z.string().min(1).default('#DC2626'),
  isActive: z.boolean().default(true),
});

const promotionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  value: z.number().positive(),
  code: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  usageLimit: z.number().int().positive().optional().nullable(),
  applicableTo: z.string().optional().default('all'),
});

type LoyaltyTier = z.infer<typeof loyaltyTierSchema> & { id: string };
type CustomerSegment = z.infer<typeof segmentSchema> & { id: string };

function normalizeOptionalDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Date(value);
}

async function readSettingsArray<T>(
  key: string,
  fallback: T[] = []
): Promise<T[]> {
  const record = await prisma.setting.findUnique({ where: { key } });
  if (!record?.value) return fallback;

  try {
    const parsed = JSON.parse(record.value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function writeSettingsArray(key: string, category: string, value: unknown[]): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: {
      key,
      category,
      dataType: 'json',
      isPublic: false,
      value: JSON.stringify(value),
    },
    update: {
      value: JSON.stringify(value),
      category,
      dataType: 'json',
    },
  });
}

function mapPromotion(discount: {
  id: string;
  name: string;
  code: string | null;
  type: string;
  value: number;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  usedCount: number;
  usageLimit: number | null;
  applicableTo: string;
}) {
  return {
    id: discount.id,
    name: discount.name || discount.code,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    startDate: discount.validFrom,
    endDate: discount.validUntil,
    status: discount.isActive ? 'ACTIVE' : 'INACTIVE',
    usage: discount.usedCount,
    usageLimit: discount.usageLimit,
    applicableTo: discount.applicableTo,
  };
}

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, page, limit, minLoyaltyPoints } = req.query;

    // Validate pagination
    const pagination = validatePagination(page || 1, limit || 50);

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
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        customers,
        pagination: createPaginationResponse(total, pagination.page, pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

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

router.get('/loyalty/tiers', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tiers = await readSettingsArray<LoyaltyTier>(LOYALTY_TIERS_SETTING_KEY, []);
    res.json({ success: true, data: { tiers } });
  } catch (error) {
    next(error);
  }
});

router.post('/loyalty/tiers', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = loyaltyTierSchema.parse(req.body);
    const tiers = await readSettingsArray<LoyaltyTier>(LOYALTY_TIERS_SETTING_KEY, []);

    const tier: LoyaltyTier = {
      ...data,
      id: crypto.randomUUID(),
    };

    tiers.push(tier);
    tiers.sort((a, b) => a.minPoints - b.minPoints);
    await writeSettingsArray(LOYALTY_TIERS_SETTING_KEY, 'customer', tiers);

    res.status(201).json({ success: true, data: { tier } });
  } catch (error) {
    next(error);
  }
});

router.put('/loyalty/tiers/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = loyaltyTierSchema.parse(req.body);
    const tiers = await readSettingsArray<LoyaltyTier>(LOYALTY_TIERS_SETTING_KEY, []);
    const index = tiers.findIndex((tier) => tier.id === req.params.id);

    if (index === -1) {
      throw new AppError('Loyalty tier not found', 404);
    }

    const tier: LoyaltyTier = {
      ...tiers[index],
      ...data,
      id: tiers[index].id,
    };

    tiers[index] = tier;
    tiers.sort((a, b) => a.minPoints - b.minPoints);
    await writeSettingsArray(LOYALTY_TIERS_SETTING_KEY, 'customer', tiers);

    res.json({ success: true, data: { tier } });
  } catch (error) {
    next(error);
  }
});

router.delete('/loyalty/tiers/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tiers = await readSettingsArray<LoyaltyTier>(LOYALTY_TIERS_SETTING_KEY, []);
    const nextTiers = tiers.filter((tier) => tier.id !== req.params.id);

    if (nextTiers.length === tiers.length) {
      throw new AppError('Loyalty tier not found', 404);
    }

    await writeSettingsArray(LOYALTY_TIERS_SETTING_KEY, 'customer', nextTiers);

    res.json({
      success: true,
      message: 'Loyalty tier deleted',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/promotions', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        promotions: discounts.map(mapPromotion),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/promotions', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = promotionSchema.parse(req.body);

    const discount = await prisma.discount.create({
      data: {
        name: data.name,
        code: (data.code || data.name).toUpperCase().replace(/\s+/g, '_'),
        type: data.type,
        value: data.value,
        validFrom: normalizeOptionalDate(data.startDate) ?? new Date(),
        validUntil: normalizeOptionalDate(data.endDate),
        isActive: data.status === 'ACTIVE',
        usageLimit: data.usageLimit ?? null,
        applicableTo: data.applicableTo,
      },
    });

    res.status(201).json({
      success: true,
      data: { promotion: mapPromotion(discount) },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/promotions/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = promotionSchema.partial().parse(req.body);

    const discount = await prisma.discount.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code.toUpperCase().replace(/\s+/g, '_') } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.startDate !== undefined ? { validFrom: normalizeOptionalDate(data.startDate) } : {}),
        ...(data.endDate !== undefined ? { validUntil: normalizeOptionalDate(data.endDate) } : {}),
        ...(data.status !== undefined ? { isActive: data.status === 'ACTIVE' } : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit ?? null } : {}),
        ...(data.applicableTo !== undefined ? { applicableTo: data.applicableTo } : {}),
      },
    });

    res.json({
      success: true,
      data: { promotion: mapPromotion(discount) },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/promotions/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.discount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Promotion deactivated',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/segments', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storedSegments = await readSettingsArray<CustomerSegment>(CUSTOMER_SEGMENTS_SETTING_KEY, []);

    const segments = await Promise.all(
      storedSegments.map(async (segment) => {
        const customerCount = await prisma.customer.count({
          where: {
            isActive: true,
            totalSpent: { gte: segment.minSpent },
            totalOrders: { gte: segment.minOrders },
            loyaltyPoints: { gte: segment.minLoyaltyPoints },
          },
        });

        return {
          ...segment,
          customerCount,
        };
      })
    );

    res.json({ success: true, data: { segments } });
  } catch (error) {
    next(error);
  }
});

router.post('/segments', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = segmentSchema.parse(req.body);
    const segments = await readSettingsArray<CustomerSegment>(CUSTOMER_SEGMENTS_SETTING_KEY, []);

    const segment: CustomerSegment = {
      ...data,
      id: crypto.randomUUID(),
    };

    segments.push(segment);
    await writeSettingsArray(CUSTOMER_SEGMENTS_SETTING_KEY, 'customer', segments);

    res.status(201).json({ success: true, data: { segment } });
  } catch (error) {
    next(error);
  }
});

router.delete('/segments/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const segments = await readSettingsArray<CustomerSegment>(CUSTOMER_SEGMENTS_SETTING_KEY, []);
    const nextSegments = segments.filter((segment) => segment.id !== req.params.id);

    if (nextSegments.length === segments.length) {
      throw new AppError('Segment not found', 404);
    }

    await writeSettingsArray(CUSTOMER_SEGMENTS_SETTING_KEY, 'customer', nextSegments);

    res.json({
      success: true,
      message: 'Segment deleted',
    });
  } catch (error) {
    next(error);
  }
});

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

router.get('/:id/orders', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const { page, limit } = req.query;

    // Validate pagination
    const pagination = validatePagination(page || 1, limit || 50);

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
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.order.count({ where: { customerId: req.params.id } }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: createPaginationResponse(total, pagination.page, pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);

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
        address: validatedData.address ? xss(validatedData.address) : undefined,
        city: validatedData.city ? xss(validatedData.city) : undefined,
        dateOfBirth: validatedData.dateOfBirth,
        gender: validatedData.gender,
        notes: validatedData.notes ? xss(validatedData.notes) : undefined,
        preferences: validatedData.preferences ? xss(validatedData.preferences) : undefined,
      },
    });

    logger.info(`Customer created: ${loggerSanitize(customer.firstName)} ${loggerSanitize(customer.lastName)} by ${loggerSanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateCustomerSchema.parse(req.body);

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

    const sanitizedData = {
      ...data,
      ...(data.address ? { address: xss(data.address) } : {}),
      ...(data.city ? { city: xss(data.city) } : {}),
      ...(data.notes ? { notes: xss(data.notes) } : {}),
      ...(data.preferences ? { preferences: xss(data.preferences) } : {}),
    };

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: sanitizedData,
    });

    res.json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

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
      const loyaltyTx = await tx.loyaltyTransaction.create({
        data: {
          customerId: req.params.id,
          points: data.points,
          reason: data.reason,
          referenceId: data.referenceId,
          balanceAfter: newBalance,
        },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: req.params.id },
        data: {
          loyaltyPoints: newBalance,
        },
      });

      return { transaction: loyaltyTx, customer: updatedCustomer };
    });

    logger.info(`Loyalty points updated for customer ${loggerSanitize(req.params.id)}: ${data.points} points by ${loggerSanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
