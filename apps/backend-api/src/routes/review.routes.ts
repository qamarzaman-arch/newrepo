import { Router, Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parsePagination } from '../utils/parsePagination';

const router = Router();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional().nullable(),
  serviceRating: z.number().int().min(1).max(5).optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  comment: z.string().optional().nullable(),
  source: z.string().optional(),
  branchId: z.string().uuid().optional().nullable(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { rating, source, branchId, status } = req.query;
    const where: any = {};
    if (rating) where.rating = parseInt(String(rating), 10);
    if (source) where.source = String(source);
    if (branchId) where.branchId = String(branchId);
    if (status) where.status = String(status);

    const [reviews, total] = await Promise.all([
      prisma.customerReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, orderNumber: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      prisma.customerReview.count({ where }),
    ]);

    res.json({
      success: true,
      data: { reviews, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.query;
    const where: any = { status: { not: 'HIDDEN' } };
    if (branchId) where.branchId = String(branchId);

    const [total, avgAgg, ratingDist, sourceDist] = await Promise.all([
      prisma.customerReview.count({ where }),
      prisma.customerReview.aggregate({ where, _avg: { rating: true } }),
      prisma.customerReview.groupBy({
        by: ['rating'],
        where,
        _count: { id: true },
      }),
      prisma.customerReview.groupBy({
        by: ['source'],
        where,
        _count: { id: true },
      }),
    ]);

    const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of ratingDist) {
      ratingDistribution[String(r.rating)] = r._count.id;
    }
    const bySource: Record<string, number> = {};
    for (const s of sourceDist) bySource[s.source] = s._count.id;

    res.json({
      success: true,
      data: {
        total,
        avgRating: avgAgg._avg.rating || 0,
        ratingDistribution,
        bySource,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.customerReview.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        order: { select: { id: true, orderNumber: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!review) throw new AppError('Review not found', 404);
    res.json({ success: true, data: { review } });
  } catch (error) {
    next(error);
  }
});

// Public endpoint - no auth (e.g. submitted via order receipt link)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReviewSchema.parse(req.body);
    if (data.orderId) {
      const order = await prisma.order.findUnique({ where: { id: data.orderId } });
      if (!order) throw new AppError('Order not found', 404);
    }
    const review = await prisma.customerReview.create({
      data: {
        rating: data.rating,
        foodRating: data.foodRating || undefined,
        serviceRating: data.serviceRating || undefined,
        orderId: data.orderId || undefined,
        customerId: data.customerId || undefined,
        comment: data.comment || undefined,
        source: data.source || 'IN_APP',
        branchId: data.branchId || undefined,
      },
    });
    res.status(201).json({ success: true, data: { review } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/reply', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reply } = z.object({ reply: z.string().min(1) }).parse(req.body);
    const review = await prisma.customerReview.update({
      where: { id: req.params.id },
      data: {
        reply,
        repliedAt: new Date(),
        repliedById: req.user!.userId,
        status: 'REPLIED',
      },
    });
    res.json({ success: true, data: { review } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/hide', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await prisma.customerReview.update({
      where: { id: req.params.id },
      data: { status: 'HIDDEN' },
    });
    res.json({ success: true, data: { review } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.customerReview.update({
      where: { id: req.params.id },
      data: { status: 'HIDDEN' },
    });
    res.json({ success: true, message: 'Review hidden' });
  } catch (error) {
    next(error);
  }
});

export default router;
