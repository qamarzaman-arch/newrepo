import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

const createDeliverySchema = z.object({
  orderId: z.string().uuid(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  deliveryAddress: z.string().min(1),
  deliveryNotes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  estimatedTime: z.number().positive().optional(),
  deliveryFee: z.number().default(0),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED']),
});

// Get all deliveries
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          order: true,
          rider: {
            select: { id: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        deliveries,
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

// Get active deliveries
router.get('/active', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: { in: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
      include: {
        order: true,
        rider: {
          select: { id: true, fullName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { deliveries },
    });
  } catch (error) {
    next(error);
  }
});

// Get single delivery
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
        rider: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    if (!delivery) throw new AppError('Delivery not found', 404);

    res.json({ success: true, data: { delivery } });
  } catch (error) {
    next(error);
  }
});

// Create delivery
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createDeliverySchema.parse(req.body);

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.delivery.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    const deliveryNumber = `DEL-${today}-${String(count + 1).padStart(3, '0')}`;

    const delivery = await prisma.delivery.create({
      data: {
        deliveryNumber,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        deliveryAddress: validatedData.deliveryAddress,
        deliveryNotes: validatedData.deliveryNotes,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        estimatedTime: validatedData.estimatedTime,
        deliveryFee: validatedData.deliveryFee,
        orderId: validatedData.orderId,
      },
      include: { order: true, rider: true },
    });

    logger.info(`Delivery created: ${sanitize(deliveryNumber)} by ${sanitize(req.user!.username)}`);
    res.status(201).json({ success: true, data: { delivery } });
  } catch (error) {
    next(error);
  }
});

// Update delivery status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);

    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'IN_TRANSIT' && { dispatchedAt: new Date() }),
        ...(status === 'PICKED_UP' && { pickedUpAt: new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
      include: { order: true, rider: true },
    });

    res.json({ success: true, data: { delivery } });
  } catch (error) {
    next(error);
  }
});

// Assign rider
router.patch('/:id/assign-rider', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { riderId } = req.body;

    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: { riderId, status: 'ASSIGNED' },
      include: { order: true, rider: true },
    });

    res.json({ success: true, data: { delivery } });
  } catch (error) {
    next(error);
  }
});

export default router;
