import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { findZoneForPoint } from '../utils/geo';

const router = Router();

// Validation schemas
const createZoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  baseFee: z.number().min(0).default(0),
  minimumOrder: z.number().min(0).default(0),
  freeDeliveryThreshold: z.number().optional(),
  estimatedTimeMin: z.number().min(1),
  estimatedTimeMax: z.number().min(1),
  isActive: z.boolean().default(true),
  color: z.string().optional(),
  coordinates: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional(),
});

const updateZoneSchema = createZoneSchema.partial();

// Get all delivery zones
router.get('/', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const zones = await (prisma as any).deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: { zones },
    });
  } catch (error) {
    next(error);
  }
});

// Get single zone
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const zone = await (prisma as any).deliveryZone.findUnique({
      where: { id: req.params.id },
    });

    if (!zone) {
      throw new AppError('Zone not found', 404);
    }

    res.json({
      success: true,
      data: { zone },
    });
  } catch (error) {
    next(error);
  }
});

// Create zone
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createZoneSchema.parse(req.body);

    const zone = await (prisma as any).deliveryZone.create({
      data: {
        ...data,
        createdById: req.user!.userId,
      },
    });

    logger.info(`Delivery zone created: ${sanitize(zone.name)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { zone },
    });
  } catch (error) {
    next(error);
  }
});

// Update zone
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateZoneSchema.parse(req.body);

    const zone = await (prisma as any).deliveryZone.update({
      where: { id: req.params.id },
      data,
    });

    logger.info(`Delivery zone updated: ${sanitize(zone.name)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { zone },
    });
  } catch (error) {
    next(error);
  }
});

// Delete zone
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await (prisma as any).deliveryZone.delete({
      where: { id: req.params.id },
    });

    logger.info(`Delivery zone deleted: ${sanitize(req.params.id)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      message: 'Zone deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Calculate delivery fee for an address using point-in-polygon containment.
router.post('/calculate-fee', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude, orderAmount } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AppError('Latitude and longitude are required as numbers', 400);
    }

    const zones = await (prisma as any).deliveryZone.findMany({
      where: { isActive: true },
    });

    const match = findZoneForPoint({ lat: latitude, lng: longitude }, zones);
    const matchedZone = match ? zones.find((z: any) => z.id === match.id) : null;

    if (!matchedZone) {
      throw new AppError('Delivery not available for this location — outside all configured zones', 400);
    }

    let fee = Number(matchedZone.baseFee || 0);
    if (matchedZone.freeDeliveryThreshold && Number(orderAmount) >= Number(matchedZone.freeDeliveryThreshold)) {
      fee = 0;
    }

    res.json({
      success: true,
      data: {
        zone: matchedZone,
        fee,
        minimumOrder: matchedZone.minimumOrder,
        estimatedTimeMin: matchedZone.estimatedTimeMin,
        estimatedTimeMax: matchedZone.estimatedTimeMax,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
