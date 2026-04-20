import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

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

// Calculate delivery fee for an address
router.post('/calculate-fee', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude, orderAmount } = req.body;

    if (!latitude || !longitude) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    // Get all zones
    const zones = await (prisma as any).deliveryZone.findMany({
      where: { isActive: true },
    });

    // Find which zone the coordinates fall into (simplified - distance-based)
    let matchedZone = null;
    let minDistance = Infinity;

    for (const zone of zones) {
      // Simple distance calculation - in production, use proper polygon containment
      if (zone.coordinates && zone.coordinates.length > 0) {
        const center = zone.coordinates[0];
        const distance = Math.sqrt(
          Math.pow(center.lat - latitude, 2) + Math.pow(center.lng - longitude, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          matchedZone = zone;
        }
      }
    }

    if (!matchedZone) {
      throw new AppError('Delivery not available for this location', 400);
    }

    // Calculate fee
    let fee = matchedZone.baseFee;
    if (matchedZone.freeDeliveryThreshold && orderAmount >= matchedZone.freeDeliveryThreshold) {
      fee = 0;
    }

    res.json({
      success: true,
      data: {
        zone: matchedZone,
        fee,
        estimatedTimeMin: matchedZone.estimatedTimeMin,
        estimatedTimeMax: matchedZone.estimatedTimeMax,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
