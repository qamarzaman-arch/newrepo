import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createDiscountSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  usageLimit: z.number().positive().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  applicableTo: z.string().default('all'),
  itemIds: z.string().optional(),
  categoryIds: z.string().optional(),
});

const updateDiscountSchema = createDiscountSchema.partial();

// Get discounts
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.query;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const discounts = await prisma.discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { discounts } });
  } catch (error) {
    next(error);
  }
});

// Validate discount code
router.post('/:id/validate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderTotal, itemIds } = req.body;

    const discount = await prisma.discount.findUnique({
      where: { id: req.params.id },
    });

    if (!discount || !discount.isActive) {
      return res.json({ success: true, data: { valid: false, reason: 'Discount not found or inactive' } });
    }

    if (discount.validFrom && new Date(discount.validFrom) > new Date()) {
      return res.json({ success: true, data: { valid: false, reason: 'Discount not yet valid' } });
    }

    if (discount.validUntil && new Date(discount.validUntil) < new Date()) {
      return res.json({ success: true, data: { valid: false, reason: 'Discount expired' } });
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return res.json({ success: true, data: { valid: false, reason: 'Usage limit reached' } });
    }

    if (discount.minValue && orderTotal < Number(discount.minValue)) {
      return res.json({ success: true, data: { valid: false, reason: `Minimum order value: $${discount.minValue}` } });
    }

    res.json({ success: true, data: { valid: true, discount } });
  } catch (error) {
    next(error);
  }
});

// Get discount stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await prisma.discount.aggregate({
      _sum: { usedCount: true, value: true },
      _avg: { value: true },
      _count: { id: true },
    });

    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
});

// Get single discount
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const discount = await prisma.discount.findUnique({ where: { id: req.params.id } });
    if (!discount) throw new AppError('Discount not found', 404);
    res.json({ success: true, data: { discount } });
  } catch (error) {
    next(error);
  }
});

// Create discount
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createDiscountSchema.parse(req.body);
    const discount = await prisma.discount.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        value: data.value,
        minValue: data.minValue,
        maxValue: data.maxValue,
        usageLimit: data.usageLimit,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        applicableTo: data.applicableTo,
        itemIds: data.itemIds,
        categoryIds: data.categoryIds,
      },
    });
    res.status(201).json({ success: true, data: { discount } });
  } catch (error) {
    next(error);
  }
});

// Update discount
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateDiscountSchema.parse(req.body);
    const discount = await prisma.discount.update({
      where: { id: req.params.id },
      data: {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    });
    res.json({ success: true, data: { discount } });
  } catch (error) {
    next(error);
  }
});

// Delete discount
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.discount.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Discount deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
