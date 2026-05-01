import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { findZoneForPoint } from '../utils/geo';
import { nextSequence, dailyScope, dateStampUTC } from '../utils/sequence';

const router = Router();

const createDeliverySchema = z.object({
  orderId: z.string().uuid(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  deliveryAddress: z.string().min(1),
  deliveryNotes: z.string().optional(),
  // QA A39: bound to legal lat/lng ranges.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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

// Create delivery — auto-resolves zone via point-in-polygon when lat/lng given.
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createDeliverySchema.parse(req.body);

    const now = new Date();
    const today = dateStampUTC(now);
    const seq = await nextSequence(dailyScope('DEL', now));
    const deliveryNumber = `DEL-${today}-${String(seq).padStart(3, '0')}`;

    // QA A37: zone lookup + delivery create must share a transaction so the
    // zone can't be deleted between resolution and persistence.
    const delivery = await prisma.$transaction(async (tx) => {
      let zoneId: string | undefined;
      let deliveryFee = Number(validatedData.deliveryFee || 0);
      let estimatedTime = validatedData.estimatedTime;

      if (validatedData.latitude !== undefined && validatedData.longitude !== undefined) {
        const zones = await (tx as any).deliveryZone.findMany({ where: { isActive: true } });
        const match = findZoneForPoint(
          { lat: Number(validatedData.latitude), lng: Number(validatedData.longitude) },
          zones
        );
        if (match) {
          const matched = zones.find((z: any) => z.id === match.id);
          zoneId = matched.id;
          if (!validatedData.deliveryFee) deliveryFee = Number(matched.baseFee || 0);
          if (!estimatedTime) estimatedTime = matched.estimatedTimeMin || matched.estimatedTimeMax;
        }
      }

      return tx.delivery.create({
        data: {
          deliveryNumber,
          customerName: validatedData.customerName,
          customerPhone: validatedData.customerPhone,
          deliveryAddress: validatedData.deliveryAddress,
          deliveryNotes: validatedData.deliveryNotes,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          estimatedTime,
          deliveryFee,
          orderId: validatedData.orderId,
          ...(zoneId ? { zoneId } : {}),
        },
        include: { order: true, rider: true, zone: true },
      });
    });

    const zoneId = (delivery as any).zoneId;

    logger.info(`Delivery created: ${sanitize(deliveryNumber)} by ${sanitize(req.user!.username)}${zoneId ? ` in zone ${zoneId}` : ''}`);
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
    if (!riderId || typeof riderId !== 'string') {
      throw new AppError('riderId is required', 400);
    }

    // QA A38: verify the rider is available and not already over the active-
    // delivery cap before assigning.
    const MAX_ACTIVE_PER_RIDER = Number(process.env.RIDER_MAX_ACTIVE_DELIVERIES || 5);
    const rider = await prisma.user.findUnique({ where: { id: riderId } });
    if (!rider || rider.role !== 'RIDER') {
      throw new AppError('User is not a rider', 400);
    }
    if (rider.isActive === false || rider.isAvailable === false) {
      throw new AppError('Rider is unavailable', 409);
    }
    const activeCount = await prisma.delivery.count({
      where: {
        riderId,
        status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
    });
    if (activeCount >= MAX_ACTIVE_PER_RIDER) {
      throw new AppError(`Rider has reached active-delivery cap (${MAX_ACTIVE_PER_RIDER})`, 409);
    }

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
