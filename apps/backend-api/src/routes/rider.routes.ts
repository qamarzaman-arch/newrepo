import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { getWebSocketManager } from '../utils/websocket';

const router = Router();

// Validation schemas
const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
});

const assignRiderSchema = z.object({
  deliveryId: z.string(),
  riderId: z.string(),
  estimatedPickupTime: z.string().optional(),
  estimatedDeliveryTime: z.string().optional(),
  notes: z.string().optional(),
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED']),
  notes: z.string().optional(),
  proofImage: z.string().optional(),
  recipientName: z.string().optional(),
  recipientSignature: z.string().optional(),
});

// Get all riders
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, isAvailable } = req.query;

    const where: any = { role: 'RIDER' };
    
    if (status) {
      where.status = status;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    const riders = await (prisma as any).user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        phone: true,
        status: true,
        isAvailable: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationAt: true,
        vehicleType: true,
        vehiclePlate: true,
        _count: {
          select: {
            assignedDeliveries: {
              where: {
                status: {
                  in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
                },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({
      success: true,
      data: { riders },
    });
  } catch (error) {
    next(error);
  }
});

// Get single rider
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rider = await (prisma as any).user.findUnique({
      where: { id: req.params.id, role: 'RIDER' },
      select: {
        id: true,
        fullName: true,
        username: true,
        phone: true,
        email: true,
        status: true,
        isAvailable: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationAt: true,
        vehicleType: true,
        vehiclePlate: true,
        assignedDeliveries: {
          where: {
            status: {
              in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
            },
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                deliveryAddress: true,
              },
            },
          },
        },
        completedDeliveries: {
          where: {
            status: 'DELIVERED',
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    });

    if (!rider) {
      throw new AppError('Rider not found', 404);
    }

    // Calculate performance metrics
    const completedCount = rider.completedDeliveries?.length || 0;
    const ratings = rider.completedDeliveries
      ?.filter((d: any) => d.rating !== null)
      .map((d: any) => d.rating);
    const avgRating = ratings?.length
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : null;

    res.json({
      success: true,
      data: {
        rider: {
          ...rider,
          stats: {
            completedDeliveries30d: completedCount,
            averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
            activeDeliveries: rider.assignedDeliveries?.length || 0,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Toggle rider availability (rider only)
router.put('/availability', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAvailable = !!req.body?.isAvailable;
    const user = await (prisma as any).user.findUnique({
      where: { id: req.user!.userId },
      select: { role: true },
    });
    if (user?.role !== 'RIDER') {
      throw new AppError('Only riders can update availability', 403);
    }
    const updated = await (prisma as any).user.update({
      where: { id: req.user!.userId },
      data: { isAvailable },
      select: { id: true, isAvailable: true },
    });
    res.json({ success: true, data: { rider: updated } });
  } catch (error) {
    next(error);
  }
});

// Update rider location (called by rider app)
router.post('/location', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateLocationSchema.parse(req.body);

    // Verify user is a rider
    const user = await (prisma as any).user.findUnique({
      where: { id: req.user!.userId },
      select: { role: true },
    });

    if (user?.role !== 'RIDER') {
      throw new AppError('Only riders can update location', 403);
    }

    const updated = await (prisma as any).user.update({
      where: { id: req.user!.userId },
      data: {
        lastLocationLat: data.latitude,
        lastLocationLng: data.longitude,
        lastLocationAt: new Date(),
      },
      select: { id: true, fullName: true, status: true, isAvailable: true, lastLocationAt: true },
    });

    // Real-time broadcast for tracking dashboards
    try {
      const ws = getWebSocketManager();
      ws.emitRiderLocationUpdate(
        req.user!.userId,
        {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: data.accuracy,
          speed: data.speed,
          heading: data.heading,
        },
        { fullName: updated.fullName, status: updated.status, isAvailable: updated.isAvailable }
      );
    } catch (wsErr) {
      logger.warn('Rider location WS emit failed', { riderId: req.user!.userId });
    }

    res.json({
      success: true,
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        updatedAt: updated.lastLocationAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get rider location (for tracking)
router.get('/:id/location', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rider = await (prisma as any).user.findUnique({
      where: { id: req.params.id, role: 'RIDER' },
      select: {
        id: true,
        fullName: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationAt: true,
        status: true,
      },
    });

    if (!rider) {
      throw new AppError('Rider not found', 404);
    }

    // Check if location is stale (older than 10 minutes)
    const isStale = rider.lastLocationAt
      ? new Date().getTime() - new Date(rider.lastLocationAt).getTime() > 10 * 60 * 1000
      : true;

    res.json({
      success: true,
      data: {
        riderId: rider.id,
        name: rider.fullName,
        location: rider.lastLocationLat && rider.lastLocationLng
          ? {
              latitude: rider.lastLocationLat,
              longitude: rider.lastLocationLng,
              updatedAt: rider.lastLocationAt,
            }
          : null,
        isStale,
        status: rider.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Assign rider to delivery
router.post('/assign', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = assignRiderSchema.parse(req.body);

    // Verify delivery exists and is pending
    const delivery = await (prisma as any).delivery.findUnique({
      where: { id: data.deliveryId },
    });

    if (!delivery) {
      throw new AppError('Delivery not found', 404);
    }

    if (delivery.status !== 'PENDING' && delivery.status !== 'UNASSIGNED') {
      throw new AppError('Delivery is already assigned or in progress', 400);
    }

    // Verify rider exists and is available
    const rider = await (prisma as any).user.findUnique({
      where: { id: data.riderId, role: 'RIDER' },
    });

    if (!rider) {
      throw new AppError('Rider not found', 404);
    }

    if (!rider.isAvailable) {
      throw new AppError('Rider is not available', 400);
    }

    // Update delivery
    const updatedDelivery = await (prisma as any).delivery.update({
      where: { id: data.deliveryId },
      data: {
        riderId: data.riderId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        estimatedPickupTime: data.estimatedPickupTime
          ? new Date(data.estimatedPickupTime)
          : null,
        estimatedDeliveryTime: data.estimatedDeliveryTime
          ? new Date(data.estimatedDeliveryTime)
          : null,
        notes: data.notes,
      },
      include: {
        rider: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            deliveryAddress: true,
          },
        },
      },
    });

    // Update rider availability
    await (prisma as any).user.update({
      where: { id: data.riderId },
      data: { isAvailable: false },
    });

    logger.info(`Rider ${sanitize(data.riderId)} assigned to delivery ${sanitize(data.deliveryId)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { delivery: updatedDelivery },
    });
  } catch (error) {
    next(error);
  }
});

// Update delivery status (called by rider)
router.post('/delivery/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateDeliveryStatusSchema.parse(req.body);

    const delivery = await (prisma as any).delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new AppError('Delivery not found', 404);
    }

    // Verify rider is assigned to this delivery
    if (delivery.riderId !== req.user!.userId && req.user!.role !== 'MANAGER' && req.user!.role !== 'ADMIN') {
      throw new AppError('Not authorized to update this delivery', 403);
    }

    const updateData: any = {
      status: data.status,
      notes: data.notes,
    };

    if (data.status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      updateData.proofImage = data.proofImage;
      updateData.recipientName = data.recipientName;
      updateData.recipientSignature = data.recipientSignature;

      // Update order status
      await (prisma as any).order.update({
        where: { id: delivery.orderId },
        data: { status: 'DELIVERED' },
      });

      // Make rider available again
      await (prisma as any).user.update({
        where: { id: delivery.riderId },
        data: { isAvailable: true },
      });
    }

    if (data.status === 'PICKED_UP') {
      updateData.pickedUpAt = new Date();
    }

    const updatedDelivery = await (prisma as any).delivery.update({
      where: { id },
      data: updateData,
      include: {
        rider: {
          select: {
            id: true,
            fullName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });

    logger.info(`Delivery ${sanitize(id)} status updated to ${sanitize(data.status)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { delivery: updatedDelivery },
    });
  } catch (error) {
    next(error);
  }
});

// Get available riders
router.get('/available/list', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km

    const riders = await (prisma as any).user.findMany({
      where: {
        role: 'RIDER',
        isAvailable: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationAt: true,
        vehicleType: true,
      },
    });

    // Calculate distance if location provided
    let availableRiders = riders;
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const r = parseFloat(radius as string);

      availableRiders = riders.filter((rider: any) => {
        if (!rider.lastLocationLat || !rider.lastLocationLng) return false;
        
        const distance = calculateDistance(
          lat,
          lng,
          rider.lastLocationLat,
          rider.lastLocationLng
        );
        
        return distance <= r;
      }).map((rider: any) => ({
        ...rider,
        distance: calculateDistance(
          lat,
          lng,
          rider.lastLocationLat,
          rider.lastLocationLng
        ),
      })).sort((a: any, b: any) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: { riders: availableRiders },
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;
